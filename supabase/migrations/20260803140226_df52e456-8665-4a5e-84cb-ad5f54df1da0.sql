CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  student_id text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL,
  phone text,
  faculty text,
  department text,
  programme text,
  level text,
  profile_photo text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX students_student_id_key ON public.students (lower(student_id));
CREATE UNIQUE INDEX students_email_key ON public.students (lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own record"
  ON public.students FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR public.has_role(auth.uid(), 'lecturer') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can update own record"
  ON public.students FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Admins can insert students"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update students"
  ON public.students FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete students"
  ON public.students FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- students may not change protected columns on their own record
CREATE OR REPLACE FUNCTION public.students_protect_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.student_id := OLD.student_id;
    NEW.email := OLD.email;
    NEW.status := OLD.status;
    NEW.auth_user_id := OLD.auth_user_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.students_protect_fields() FROM PUBLIC;

CREATE TRIGGER students_protect_fields_trg
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.students_protect_fields();

-- link/create student record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _matric text;
BEGIN
  BEGIN
    _role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'student')::public.app_role;
  EXCEPTION WHEN OTHERS THEN
    _role := 'student';
  END;

  INSERT INTO public.profiles (id, full_name, email, institution)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'institution', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _role = 'student' THEN
    UPDATE public.students
      SET auth_user_id = NEW.id
      WHERE auth_user_id IS NULL AND lower(email) = lower(COALESCE(NEW.email, ''));

    IF NOT FOUND THEN
      _matric := NULLIF(NEW.raw_user_meta_data ->> 'matric_number', '');
      INSERT INTO public.students (auth_user_id, student_id, full_name, email, department)
      VALUES (
        NEW.id,
        COALESCE(_matric, 'NC-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 8))),
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        COALESCE(NEW.email, ''),
        NULLIF(NEW.raw_user_meta_data ->> 'department', '')
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;