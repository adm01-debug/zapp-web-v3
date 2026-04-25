-- Allow users to see their own QR refresh attempts (in addition to admins/supervisors).
-- Needed so the connection dialog can surface the last attempt time + result
-- to the very user who just clicked "Generate QR".
CREATE POLICY "Users can view their own QR attempts"
ON public.qr_attempts
FOR SELECT
TO authenticated
USING (requested_by = auth.uid());