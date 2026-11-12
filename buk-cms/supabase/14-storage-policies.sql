-- 14. BUK Care Private Storage Buckets and Policies
-- Student uploads their own documents and passport photo.
-- Records staff review documents. Records/Nurse/Doctor view patient photos.

INSERT INTO storage.buckets (id, name, public)
VALUES ('student-documents', 'student-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-photos', 'patient-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Student uploads documents under: <MATRIC>/<filename>
CREATE POLICY student_upload_own_documents
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'student-documents'
    AND (storage.foldername(name))[1] = (SELECT public.buk_current_student_matric())
);

-- Student can view their own submitted documents.
CREATE POLICY student_view_own_documents
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'student-documents'
    AND (storage.foldername(name))[1] = (SELECT public.buk_current_student_matric())
);

-- Only Records staff review submitted registration documents.
CREATE POLICY records_view_student_documents
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'student-documents'
    AND (SELECT public.buk_current_role()) = 'records'
);

-- Student uploads passport photo to private patient-photos bucket,
-- using the same matric-number folder convention.
CREATE POLICY student_upload_own_passport_photo
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'patient-photos'
    AND (storage.foldername(name))[1] = (SELECT public.buk_current_student_matric())
);

-- Records, Nurse and Doctor can view patient passport photos.
CREATE POLICY clinical_staff_view_patient_photos
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'patient-photos'
    AND (SELECT public.buk_current_role()) IN ('records', 'nurse', 'doctor')
);

-- Students may view their own passport photo while signed in.
CREATE POLICY student_view_own_passport_photo
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'patient-photos'
    AND (storage.foldername(name))[1] = (SELECT public.buk_current_student_matric())
);

-- No public access and no client-side delete/update policy is granted.
-- If resubmission/replacement is needed, implement a controlled workflow.
