-- ============ EXAMS ============
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS lecturer_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS total_marks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pass_mark integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS start_time timestamptz,
  ADD COLUMN IF NOT EXISTS end_time timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS allow_multiple_attempts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_result_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.exams SET lecturer_id = COALESCE(lecturer_id, created_by),
                        start_time  = COALESCE(start_time, starts_at),
                        status      = CASE WHEN is_published THEN 'published' ELSE 'draft' END;

DO $$ BEGIN
  ALTER TABLE public.exams ADD CONSTRAINT exams_status_chk
    CHECK (status IN ('draft','published','closed','archived'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS exams_updated_at ON public.exams;
CREATE TRIGGER exams_updated_at BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ QUESTIONS ============
ALTER TABLE public.exam_questions
  ALTER COLUMN prompt DROP NOT NULL,
  ALTER COLUMN options DROP NOT NULL,
  ALTER COLUMN correct_index DROP NOT NULL,
  ALTER COLUMN position DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS question_text text,
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'mcq',
  ADD COLUMN IF NOT EXISTS marks integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS question_order integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

UPDATE public.exam_questions SET question_text = COALESCE(question_text, prompt),
                                 question_order = COALESCE(position, 1);

DO $$ BEGIN
  ALTER TABLE public.exam_questions ADD CONSTRAINT exam_questions_type_chk
    CHECK (question_type IN ('mcq','true_false','short_answer'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ QUESTION OPTIONS ============
CREATE TABLE IF NOT EXISTS public.question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  option_order integer NOT NULL DEFAULT 1,
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS question_options_question_idx ON public.question_options(question_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_options TO authenticated;
GRANT ALL ON public.question_options TO service_role;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;

-- ============ ATTEMPTS ============
ALTER TABLE public.exam_attempts
  ADD COLUMN IF NOT EXISTS started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS percentage numeric,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS auto_submitted boolean NOT NULL DEFAULT false;

UPDATE public.exam_attempts SET status = 'graded' WHERE submitted_at IS NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.exam_attempts ADD CONSTRAINT exam_attempts_status_chk
    CHECK (status IN ('in_progress','submitted','graded'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ STUDENT ANSWERS ============
CREATE TABLE IF NOT EXISTS public.student_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  selected_option_id uuid REFERENCES public.question_options(id) ON DELETE SET NULL,
  answer_text text,
  marks_awarded numeric,
  is_correct boolean,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);
CREATE INDEX IF NOT EXISTS student_answers_attempt_idx ON public.student_answers(attempt_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_answers TO authenticated;
GRANT ALL ON public.student_answers TO service_role;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS student_answers_updated_at ON public.student_answers;
CREATE TRIGGER student_answers_updated_at BEFORE UPDATE ON public.student_answers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.is_exam_owner(_exam_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM public.exams e LEFT JOIN public.courses c ON c.id = e.course_id
                  WHERE e.id = _exam_id AND (e.lecturer_id = auth.uid() OR e.created_by = auth.uid() OR c.lecturer_id = auth.uid()));
$$;

-- keep total_marks in sync with the sum of question marks
CREATE OR REPLACE FUNCTION public.exam_questions_sync_total()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _exam uuid := COALESCE(NEW.exam_id, OLD.exam_id);
BEGIN
  UPDATE public.exams e
     SET total_marks = COALESCE((SELECT SUM(q.marks) FROM public.exam_questions q WHERE q.exam_id = _exam), 0)
   WHERE e.id = _exam;
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS exam_questions_sync_total_trg ON public.exam_questions;
CREATE TRIGGER exam_questions_sync_total_trg AFTER INSERT OR UPDATE OR DELETE ON public.exam_questions
  FOR EACH ROW EXECUTE FUNCTION public.exam_questions_sync_total();

-- ============ POLICIES ============
DROP POLICY IF EXISTS "exams read" ON public.exams;
CREATE POLICY "exams read" ON public.exams FOR SELECT TO authenticated
  USING (status IN ('published','closed') OR public.is_exam_owner(id));

DROP POLICY IF EXISTS "exam questions read" ON public.exam_questions;
CREATE POLICY "exam questions read" ON public.exam_questions FOR SELECT TO authenticated
  USING (public.is_exam_owner(exam_id));

CREATE POLICY "question options manage" ON public.question_options FOR ALL TO authenticated
  USING (public.is_exam_owner((SELECT q.exam_id FROM public.exam_questions q WHERE q.id = question_id)))
  WITH CHECK (public.is_exam_owner((SELECT q.exam_id FROM public.exam_questions q WHERE q.id = question_id)));

CREATE POLICY "student answers read" ON public.student_answers FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exam_attempts a WHERE a.id = attempt_id
             AND (a.student_id = auth.uid() OR public.is_exam_owner(a.exam_id)))
  );

CREATE POLICY "student answers grade" ON public.student_answers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exam_attempts a WHERE a.id = attempt_id AND public.is_exam_owner(a.exam_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.exam_attempts a WHERE a.id = attempt_id AND public.is_exam_owner(a.exam_id)));

-- ============ EXAM ENGINE ============
CREATE OR REPLACE FUNCTION public.start_exam_attempt(_exam_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _e public.exams%ROWTYPE; _uid uuid := auth.uid(); _existing public.exam_attempts%ROWTYPE; _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;
  SELECT * INTO _e FROM public.exams WHERE id = _exam_id;
  IF _e.id IS NULL THEN RAISE EXCEPTION 'This examination is unavailable.'; END IF;
  IF _e.status <> 'published' THEN RAISE EXCEPTION 'This examination is not open.'; END IF;
  IF _e.start_time IS NOT NULL AND now() < _e.start_time THEN RAISE EXCEPTION 'This examination has not started yet.'; END IF;
  IF _e.end_time IS NOT NULL AND now() > _e.end_time THEN RAISE EXCEPTION 'This examination has closed.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.enrollments en WHERE en.course_id = _e.course_id AND en.student_id = _uid) THEN
    RAISE EXCEPTION 'You are not registered for this course.';
  END IF;

  SELECT * INTO _existing FROM public.exam_attempts
   WHERE exam_id = _exam_id AND student_id = _uid ORDER BY created_at DESC LIMIT 1;

  IF _existing.id IS NOT NULL AND _existing.submitted_at IS NULL THEN
    RETURN _existing.id; -- resume
  END IF;
  IF _existing.id IS NOT NULL AND NOT _e.allow_multiple_attempts THEN
    RAISE EXCEPTION 'You have already taken this examination.';
  END IF;

  INSERT INTO public.exam_attempts (exam_id, student_id, started_at, status, answers)
  VALUES (_exam_id, _uid, now(), 'in_progress', '{}'::jsonb) RETURNING id INTO _id;
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_exam_paper(_attempt_id uuid)
RETURNS TABLE (question_id uuid, question_text text, question_type text, marks integer,
               question_order integer, options jsonb, selected_option_id uuid, answer_text text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _a public.exam_attempts%ROWTYPE;
BEGIN
  SELECT * INTO _a FROM public.exam_attempts WHERE id = _attempt_id;
  IF _a.id IS NULL THEN RAISE EXCEPTION 'Attempt not found.'; END IF;
  IF _a.student_id <> auth.uid() AND NOT public.is_exam_owner(_a.exam_id) THEN
    RAISE EXCEPTION 'You are not allowed to view this paper.';
  END IF;

  RETURN QUERY
  SELECT q.id, q.question_text, q.question_type, q.marks, q.question_order,
         COALESCE((SELECT jsonb_agg(jsonb_build_object('id', o.id, 'option_text', o.option_text)
                     ORDER BY o.option_order)
                     FROM public.question_options o WHERE o.question_id = q.id), '[]'::jsonb),
         sa.selected_option_id, sa.answer_text
    FROM public.exam_questions q
    LEFT JOIN public.student_answers sa ON sa.question_id = q.id AND sa.attempt_id = _attempt_id
   WHERE q.exam_id = _a.exam_id
   ORDER BY q.question_order, q.created_at;
END; $$;

CREATE OR REPLACE FUNCTION public.save_exam_answer(_attempt_id uuid, _question_id uuid,
                                                   _selected_option_id uuid DEFAULT NULL,
                                                   _answer_text text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a public.exam_attempts%ROWTYPE; _e public.exams%ROWTYPE;
BEGIN
  SELECT * INTO _a FROM public.exam_attempts WHERE id = _attempt_id FOR UPDATE;
  IF _a.id IS NULL OR _a.student_id <> auth.uid() THEN RAISE EXCEPTION 'Unauthorized.'; END IF;
  IF _a.submitted_at IS NOT NULL THEN RAISE EXCEPTION 'This examination has already been submitted.'; END IF;
  SELECT * INTO _e FROM public.exams WHERE id = _a.exam_id;
  IF now() > _a.started_at + make_interval(mins => _e.duration_minutes)
     OR (_e.end_time IS NOT NULL AND now() > _e.end_time) THEN
    RAISE EXCEPTION 'Your examination time has elapsed.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.exam_questions q WHERE q.id = _question_id AND q.exam_id = _a.exam_id) THEN
    RAISE EXCEPTION 'Question does not belong to this examination.';
  END IF;

  INSERT INTO public.student_answers (attempt_id, question_id, selected_option_id, answer_text)
  VALUES (_attempt_id, _question_id, _selected_option_id, _answer_text)
  ON CONFLICT (attempt_id, question_id)
  DO UPDATE SET selected_option_id = EXCLUDED.selected_option_id,
                answer_text = EXCLUDED.answer_text,
                updated_at = now();
END; $$;

CREATE OR REPLACE FUNCTION public.recalc_attempt_score(_attempt_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a public.exam_attempts%ROWTYPE; _total numeric; _score numeric; _pending int;
BEGIN
  SELECT * INTO _a FROM public.exam_attempts WHERE id = _attempt_id;
  SELECT COALESCE(SUM(q.marks), 0) INTO _total FROM public.exam_questions q WHERE q.exam_id = _a.exam_id;
  SELECT COALESCE(SUM(sa.marks_awarded), 0) INTO _score FROM public.student_answers sa WHERE sa.attempt_id = _attempt_id;
  SELECT COUNT(*) INTO _pending
    FROM public.exam_questions q
    JOIN public.student_answers sa ON sa.question_id = q.id AND sa.attempt_id = _attempt_id
   WHERE q.question_type = 'short_answer' AND sa.marks_awarded IS NULL;

  UPDATE public.exam_attempts
     SET score = _score,
         percentage = CASE WHEN _total > 0 THEN ROUND(_score / _total * 100, 2) ELSE 0 END,
         status = CASE WHEN _pending > 0 THEN 'submitted' ELSE 'graded' END
   WHERE id = _attempt_id;
END; $$;

CREATE OR REPLACE FUNCTION public.submit_exam_attempt(_attempt_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a public.exam_attempts%ROWTYPE; _e public.exams%ROWTYPE; _expired boolean;
BEGIN
  SELECT * INTO _a FROM public.exam_attempts WHERE id = _attempt_id FOR UPDATE;
  IF _a.id IS NULL THEN RAISE EXCEPTION 'Attempt not found.'; END IF;
  IF _a.student_id <> auth.uid() AND NOT public.is_exam_owner(_a.exam_id) THEN RAISE EXCEPTION 'Unauthorized.'; END IF;
  IF _a.submitted_at IS NOT NULL THEN RETURN _attempt_id; END IF;

  SELECT * INTO _e FROM public.exams WHERE id = _a.exam_id;
  _expired := now() > _a.started_at + make_interval(mins => _e.duration_minutes)
              OR (_e.end_time IS NOT NULL AND now() > _e.end_time);

  -- objective auto-grading
  UPDATE public.student_answers sa
     SET is_correct = (o.is_correct IS TRUE),
         marks_awarded = CASE WHEN o.is_correct IS TRUE THEN q.marks ELSE 0 END
    FROM public.exam_questions q
    LEFT JOIN public.question_options o ON o.id = sa.selected_option_id
   WHERE sa.attempt_id = _attempt_id AND q.id = sa.question_id
     AND q.question_type IN ('mcq','true_false');

  UPDATE public.exam_attempts
     SET submitted_at = now(), auto_submitted = _expired
   WHERE id = _attempt_id;

  PERFORM public.recalc_attempt_score(_attempt_id);
  RETURN _attempt_id;
END; $$;

CREATE OR REPLACE FUNCTION public.grade_short_answer(_answer_id uuid, _marks numeric, _feedback text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _attempt uuid; _exam uuid; _max numeric;
BEGIN
  SELECT sa.attempt_id, a.exam_id, q.marks INTO _attempt, _exam, _max
    FROM public.student_answers sa
    JOIN public.exam_attempts a ON a.id = sa.attempt_id
    JOIN public.exam_questions q ON q.id = sa.question_id
   WHERE sa.id = _answer_id;
  IF _attempt IS NULL THEN RAISE EXCEPTION 'Answer not found.'; END IF;
  IF NOT public.is_exam_owner(_exam) THEN RAISE EXCEPTION 'Unauthorized.'; END IF;
  IF _marks < 0 OR _marks > _max THEN RAISE EXCEPTION 'Marks must be between 0 and %.', _max; END IF;

  UPDATE public.student_answers
     SET marks_awarded = _marks, is_correct = (_marks >= _max), feedback = _feedback
   WHERE id = _answer_id;

  PERFORM public.recalc_attempt_score(_attempt);
END; $$;

REVOKE ALL ON FUNCTION public.start_exam_attempt(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_exam_paper(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_exam_answer(uuid, uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_exam_attempt(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grade_short_answer(uuid, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recalc_attempt_score(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_exam_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_exam_attempt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exam_paper(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_exam_answer(uuid, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_exam_attempt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grade_short_answer(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_exam_owner(uuid) TO authenticated;