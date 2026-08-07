
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS graded_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS grading_date timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS submissions_assignment_student_unique
  ON public.submissions (assignment_id, student_id);

DROP TRIGGER IF EXISTS assignments_updated_at ON public.assignments;
CREATE TRIGGER assignments_updated_at BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS submissions_updated_at ON public.submissions;
CREATE TRIGGER submissions_updated_at BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- students only read published assignments
DROP POLICY IF EXISTS "assignments read" ON public.assignments;
CREATE POLICY "assignments read" ON public.assignments FOR SELECT TO authenticated
USING (
  status = 'published'
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = assignments.course_id AND c.lecturer_id = auth.uid())
);

-- validation for submissions
CREATE OR REPLACE FUNCTION public.submissions_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _a public.assignments%ROWTYPE;
  _is_owner boolean;
BEGIN
  SELECT * INTO _a FROM public.assignments WHERE id = NEW.assignment_id;
  IF _a.id IS NULL THEN
    RAISE EXCEPTION 'Assignment not found.';
  END IF;

  SELECT (public.has_role(auth.uid(), 'admin')
          OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = _a.course_id AND c.lecturer_id = auth.uid()))
    INTO _is_owner;

  IF _is_owner THEN
    IF TG_OP = 'UPDATE' AND NEW.score IS NOT NULL AND OLD.score IS DISTINCT FROM NEW.score THEN
      NEW.graded_by := auth.uid();
      NEW.grading_date := now();
      IF NEW.status = 'submitted' THEN NEW.status := 'graded'; END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- student path
  IF _a.status <> 'published' THEN
    RAISE EXCEPTION 'This assignment is not open for submission.';
  END IF;
  IF _a.due_date IS NOT NULL AND now() > _a.due_date THEN
    RAISE EXCEPTION 'The submission deadline has passed.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments e WHERE e.course_id = _a.course_id AND e.student_id = NEW.student_id
  ) THEN
    RAISE EXCEPTION 'You are not registered for this course.';
  END IF;
  IF TG_OP = 'UPDATE' AND (OLD.score IS NOT NULL OR OLD.status IN ('graded','returned')) THEN
    RAISE EXCEPTION 'This submission has already been graded and can no longer be edited.';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.score := OLD.score;
    NEW.feedback := OLD.feedback;
    NEW.graded_by := OLD.graded_by;
    NEW.grading_date := OLD.grading_date;
    NEW.status := 'submitted';
    NEW.submitted_at := now();
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.submissions_validate() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS submissions_validate_trg ON public.submissions;
CREATE TRIGGER submissions_validate_trg BEFORE INSERT OR UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.submissions_validate();

-- notifications
CREATE OR REPLACE FUNCTION public.assignments_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code text;
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    SELECT c.code INTO _code FROM public.courses c WHERE c.id = NEW.course_id;
    INSERT INTO public.notifications (user_id, title, body, category)
    SELECT e.student_id,
           'New assignment: ' || NEW.title,
           COALESCE(_code, 'Course') || ' — due ' || COALESCE(to_char(NEW.due_date, 'DD Mon YYYY HH24:MI'), 'no deadline'),
           'assignment'
      FROM public.enrollments e WHERE e.course_id = NEW.course_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.assignments_notify() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS assignments_notify_trg ON public.assignments;
CREATE TRIGGER assignments_notify_trg AFTER INSERT OR UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.assignments_notify();

CREATE OR REPLACE FUNCTION public.submissions_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _a public.assignments%ROWTYPE;
  _lecturer uuid;
  _name text;
BEGIN
  SELECT * INTO _a FROM public.assignments WHERE id = NEW.assignment_id;
  SELECT c.lecturer_id INTO _lecturer FROM public.courses c WHERE c.id = _a.course_id;

  IF TG_OP = 'INSERT' AND _lecturer IS NOT NULL THEN
    SELECT full_name INTO _name FROM public.profiles WHERE id = NEW.student_id;
    INSERT INTO public.notifications (user_id, title, body, category)
    VALUES (_lecturer, 'New submission: ' || _a.title, COALESCE(_name, 'A student') || ' submitted their work.', 'assignment');
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.score IS NOT NULL AND OLD.score IS DISTINCT FROM NEW.score THEN
    INSERT INTO public.notifications (user_id, title, body, category)
    VALUES (NEW.student_id, 'Assignment graded: ' || _a.title,
            'You scored ' || NEW.score || '/' || _a.max_score || '.', 'assignment');
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.submissions_notify() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS submissions_notify_trg ON public.submissions;
CREATE TRIGGER submissions_notify_trg AFTER INSERT OR UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.submissions_notify();
