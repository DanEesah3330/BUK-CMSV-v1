BUK CARE - SUPABASE SQL MODULES

IMPORTANT: Do not run these files in alphabetical order without following this list.
Use the Supabase SQL Editor and run each file's complete contents in this exact order:

1.  01-profiles.sql
2.  02-students-registry.sql
3.  03-patients.sql
4.  04-registration-requests.sql
5.  05-visits.sql
6.  06-consultations.sql
7.  07-vitals.sql
8.  08-diagnostics.sql
9.  09-medicines.sql
10. 10-medical-supplies.sql
11. 11-prescriptions.sql
12. 12-inventory-movements.sql
13. 15-audit-logs.sql
14. 13-security-policies.sql
15. 14-storage-policies.sql

Why this order: the storage policies call helper functions created by the RLS file,
so the RLS file must run before the Storage file.

SECURITY NOTES
- Use synthetic/demo patient data until every role has been tested.
- Student and staff have separate login pages, but both authenticate through Supabase Auth.
- Student profiles must be created by a trusted signup/provisioning workflow and linked
to their own matric number. Do not let public signup choose a role or student_matric.
- Staff profiles must be provisioned by an administrator/trusted backend process.
- Never put the Supabase service_role/secret key in frontend JavaScript.
- Buckets are private. Students upload into a folder named exactly as their matric number.
  Example: student-documents/CST-23-SWE-01131/admission-letter.pdf
  Use the exact matric formatting stored in students_registry.
- Student documents can be viewed by the student and Records staff.
- Passport photos can be viewed by the student and Records, Nurse, and Doctor staff.
- The SQL policies are a starting role-based design and must be tested with separate
  student and staff accounts before real patient information is used.

KNOWN IMPLEMENTATION WORK STILL REQUIRED
- Implement trusted account provisioning for student/staff profiles.
- Implement the student registration submission and Records approval workflow in the app.
- On approval, create the patients row and set passport_photo_path to the object path
  in the private patient-photos bucket.
- Implement secure signed-URL retrieval for private photos/documents in the frontend.
- Implement stock updates and inventory movement recording in a transaction/RPC so
  quantities and movements cannot become inconsistent.
- Confirm table/column names against the current BUK Care JavaScript before integration.
