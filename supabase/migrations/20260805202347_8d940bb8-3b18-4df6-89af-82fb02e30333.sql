
ALTER TABLE public.attendance_sessions
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT 'qr',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';

CREATE UNIQUE INDEX IF NOT EXISTS attendance_sessions_code_key ON public.attendance_sessions (session_code);

ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS check_in_time timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verification_method text NOT NULL DEFAULT 'qr',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS attendance_records_session_student_key
  ON public.attendance_records (session_id, student_id);

CREATE OR REPLACE FUNCTION public.attendance_records_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _s public.attendance_sessions%ROWTYPE;
BEGIN
  SELECT * INTO _s FROM public.attendance_sessions WHERE id = NEW.session_id;
  IF _s.id IS NULL THEN
    RAISE EXCEPTION 'Attendance session not found.';
  END IF;

  -- lecturer of the session or admin may record/edit freely
  IF _s.lecturer_id = auth.uid() OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF _s.status <> 'open' THEN
      RAISE EXCEPTION 'This attendance session is closed.';
    END IF;
    IF _s.expires_at IS NOT NULL AND now() > _s.expires_at THEN
      RAISE EXCEPTION 'This attendance session has expired.';
    END IF;
    IF _s.held_on IS NOT NULL AND _s.held_on <> (now() AT TIME ZONE 'utc')::date THEN
      RAISE EXCEPTION 'Attendance can only be marked on the session date.';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.enrollments e
       WHERE e.course_id = _s.course_id AND e.student_id = NEW.student_id
    ) THEN
      RAISE EXCEPTION 'You are not registered for this course.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attendance_records_validate_trg ON public.attendance_records;
CREATE TRIGGER attendance_records_validate_trg
  BEFORE INSERT OR UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.attendance_records_validate();

REVOKE ALL ON FUNCTION public.attendance_records_validate() FROM PUBLIC, anon, authenticated;
