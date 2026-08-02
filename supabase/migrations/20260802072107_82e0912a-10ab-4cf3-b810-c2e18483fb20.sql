
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

DROP POLICY "submissions update" ON public.submissions;
CREATE POLICY "submissions update" ON public.submissions FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.assignments a JOIN public.courses c ON c.id = a.course_id WHERE a.id = assignment_id AND c.lecturer_id = auth.uid()))
  WITH CHECK (student_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.assignments a JOIN public.courses c ON c.id = a.course_id WHERE a.id = assignment_id AND c.lecturer_id = auth.uid()));

DROP POLICY "att records update" ON public.attendance_records;
CREATE POLICY "att records update" ON public.attendance_records FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.attendance_sessions s WHERE s.id = session_id AND s.lecturer_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.attendance_sessions s WHERE s.id = session_id AND s.lecturer_id = auth.uid()));
