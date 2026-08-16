CREATE POLICY "Users can upload own pix proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pix-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own pix proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pix-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all pix proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pix-proofs' AND public.has_role(auth.uid(), 'admin'));