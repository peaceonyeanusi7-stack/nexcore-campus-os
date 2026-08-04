
-- 1. Extend courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS courses_code_unique ON public.courses (upper(code));

DROP TRIGGER IF EXISTS courses_updated_at ON public.courses;
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Registration periods
CREATE TABLE IF NOT EXISTS public.registration_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session text NOT NULL,
  semester text NOT NULL,
  opens_at timestamptz NOT NULL DEFAULT now(),
  closes_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.registration_periods TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.registration_periods TO authenticated;
GRANT ALL ON public.registration_periods TO service_role;
ALTER TABLE public.registration_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registration periods read" ON public.registration_periods;
CREATE POLICY "registration periods read" ON public.registration_periods
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "registration periods admin write" ON public.registration_periods;
CREATE POLICY "registration periods admin write" ON public.registration_periods
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS registration_periods_updated_at ON public.registration_periods;
CREATE TRIGGER registration_periods_updated_at BEFORE UPDATE ON public.registration_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Course registrations
CREATE TABLE IF NOT EXISTS public.course_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  session text NOT NULL DEFAULT '',
  semester text NOT NULL DEFAULT '',
  registration_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'registered',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id, session)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_registrations TO authenticated;
GRANT ALL ON public.course_registrations TO service_role;
ALTER TABLE public.course_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course registrations read" ON public.course_registrations;
CREATE POLICY "course registrations read" ON public.course_registrations
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.lecturer_id = auth.uid())
  );

DROP POLICY IF EXISTS "course registrations student insert" ON public.course_registrations;
CREATE POLICY "course registrations student insert" ON public.course_registrations
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "course registrations student delete" ON public.course_registrations;
CREATE POLICY "course registrations student delete" ON public.course_registrations
  FOR DELETE TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "course registrations admin update" ON public.course_registrations;
CREATE POLICY "course registrations admin update" ON public.course_registrations
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS course_registrations_updated_at ON public.course_registrations;
CREATE TRIGGER course_registrations_updated_at BEFORE UPDATE ON public.course_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Validation trigger: deadline + department/level eligibility
CREATE OR REPLACE FUNCTION public.course_registrations_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _period public.registration_periods%ROWTYPE;
  _course public.courses%ROWTYPE;
  _student public.students%ROWTYPE;
  _is_admin boolean := public.has_role(auth.uid(), 'admin');
BEGIN
  IF _is_admin THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT * INTO _period FROM public.registration_periods
   WHERE is_active ORDER BY closes_at DESC LIMIT 1;

  IF _period.id IS NOT NULL THEN
    IF now() < _period.opens_at OR now() > _period.closes_at THEN
      RAISE EXCEPTION 'Course registration is closed for this period.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  SELECT * INTO _course FROM public.courses WHERE id = NEW.course_id;
  IF _course.id IS NULL THEN
    RAISE EXCEPTION 'Course not found.';
  END IF;
  IF _course.status <> 'active' THEN
    RAISE EXCEPTION 'This course is not open for registration.';
  END IF;

  SELECT * INTO _student FROM public.students WHERE auth_user_id = NEW.student_id;
  IF _student.id IS NOT NULL THEN
    IF _course.department IS NOT NULL AND _student.department IS NOT NULL
       AND lower(_course.department) <> lower(_student.department) THEN
      RAISE EXCEPTION 'This course belongs to another department.';
    END IF;
    IF _course.level IS NOT NULL AND _student.level IS NOT NULL
       AND _course.level <> _student.level THEN
      RAISE EXCEPTION 'This course is not offered at your level.';
    END IF;
  END IF;

  IF _period.id IS NOT NULL THEN
    IF COALESCE(NEW.session, '') = '' THEN NEW.session := _period.session; END IF;
    IF COALESCE(NEW.semester, '') = '' THEN NEW.semester := _period.semester; END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.course_registrations_validate() FROM PUBLIC, authenticated, anon;

DROP TRIGGER IF EXISTS course_registrations_validate_trg ON public.course_registrations;
CREATE TRIGGER course_registrations_validate_trg
  BEFORE INSERT OR DELETE ON public.course_registrations
  FOR EACH ROW EXECUTE FUNCTION public.course_registrations_validate();

-- 5. Keep legacy enrollments in sync
CREATE OR REPLACE FUNCTION public.course_registrations_sync_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.enrollments (course_id, student_id, status)
    VALUES (NEW.course_id, NEW.student_id, 'active')
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  ELSE
    DELETE FROM public.enrollments
     WHERE course_id = OLD.course_id AND student_id = OLD.student_id;
    RETURN OLD;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.course_registrations_sync_enrollment() FROM PUBLIC, authenticated, anon;

DROP TRIGGER IF EXISTS course_registrations_sync_trg ON public.course_registrations;
CREATE TRIGGER course_registrations_sync_trg
  AFTER INSERT OR DELETE ON public.course_registrations
  FOR EACH ROW EXECUTE FUNCTION public.course_registrations_sync_enrollment();

-- 6. Backfill existing enrollments into course_registrations
INSERT INTO public.course_registrations (student_id, course_id, registration_date, created_at)
SELECT e.student_id, e.course_id, e.created_at, e.created_at
FROM public.enrollments e
ON CONFLICT DO NOTHING;
