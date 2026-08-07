
CREATE POLICY "assignment files read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'assignment-files' AND (
    (storage.foldername(name))[1] = 'assignments'
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'lecturer')
  )
);

CREATE POLICY "assignment files insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'assignment-files' AND (
    ((storage.foldername(name))[1] = 'assignments'
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lecturer')))
    OR ((storage.foldername(name))[1] = 'submissions'
      AND (storage.foldername(name))[2] = auth.uid()::text)
  )
);

CREATE POLICY "assignment files update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'assignment-files' AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR ((storage.foldername(name))[1] = 'assignments' AND public.has_role(auth.uid(), 'lecturer'))
  )
)
WITH CHECK (
  bucket_id = 'assignment-files' AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR ((storage.foldername(name))[1] = 'assignments' AND public.has_role(auth.uid(), 'lecturer'))
  )
);

CREATE POLICY "assignment files delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'assignment-files' AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR ((storage.foldername(name))[1] = 'assignments' AND public.has_role(auth.uid(), 'lecturer'))
  )
);
