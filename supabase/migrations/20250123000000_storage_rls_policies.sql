-- Storage RLS Policies for Invoices Bucket
-- Allows authenticated users to upload, read, and delete invoice files

-- Allow authenticated users to upload invoices
CREATE POLICY "Users can upload invoices"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invoices');

-- Allow authenticated users to read invoices
CREATE POLICY "Users can read invoices"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'invoices');

-- Allow authenticated users to update invoices (for metadata)
CREATE POLICY "Users can update invoices"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'invoices')
WITH CHECK (bucket_id = 'invoices');

-- Allow authenticated users to delete invoices
CREATE POLICY "Users can delete invoices"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'invoices');

-- Add comment
COMMENT ON POLICY "Users can upload invoices" ON storage.objects IS 'Allows authenticated users to upload invoice files to the invoices bucket';
COMMENT ON POLICY "Users can read invoices" ON storage.objects IS 'Allows authenticated users to read invoice files from the invoices bucket';
COMMENT ON POLICY "Users can update invoices" ON storage.objects IS 'Allows authenticated users to update invoice file metadata';
COMMENT ON POLICY "Users can delete invoices" ON storage.objects IS 'Allows authenticated users to delete invoice files';
