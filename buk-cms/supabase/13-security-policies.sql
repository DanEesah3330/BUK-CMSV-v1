-- 13. BUK Care Row Level Security (RLS)
-- Run AFTER files 01-13 and 15.
-- Staff/student profiles must be provisioned by a trusted signup/admin process.
-- Never allow users to choose their own role during public signup.

-- Helper functions avoid repeating profile lookups in every policy.
CREATE OR REPLACE FUNCTION public.buk_current_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT p.role
    FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.buk_current_student_matric()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT p.student_matric
    FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
      AND p.role = 'student'
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.buk_current_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.buk_current_student_matric() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buk_current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.buk_current_student_matric() TO authenticated;

-- Enable RLS on every application table.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES: users can read only their own profile. No client-side role changes.
CREATE POLICY profiles_select_own
ON public.profiles FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()));

-- STUDENT REGISTRY: students can look up only their own registry row;
-- authorized Records staff can search the simulated registry.
CREATE POLICY students_registry_select
ON public.students_registry FOR SELECT TO authenticated
USING (
    matric = (SELECT public.buk_current_student_matric())
    OR (SELECT public.buk_current_role()) = 'records'
);

-- REGISTRATION REQUESTS: student submits and reads own request;
-- Records staff review and update requests.
CREATE POLICY registration_requests_student_select
ON public.clinic_registration_requests FOR SELECT TO authenticated
USING (matric = (SELECT public.buk_current_student_matric()));

CREATE POLICY registration_requests_student_insert
ON public.clinic_registration_requests FOR INSERT TO authenticated
WITH CHECK (
    matric = (SELECT public.buk_current_student_matric())
    AND status = 'Pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND rejection_reason IS NULL
);

CREATE POLICY registration_requests_records_all
ON public.clinic_registration_requests FOR ALL TO authenticated
USING ((SELECT public.buk_current_role()) = 'records')
WITH CHECK ((SELECT public.buk_current_role()) = 'records');

-- PATIENTS: patient sees own basic clinic record; clinical staff access
-- according to their role. Only Records staff create/update patient records.
CREATE POLICY patients_student_select_own
ON public.patients FOR SELECT TO authenticated
USING (matric = (SELECT public.buk_current_student_matric()));

CREATE POLICY patients_clinical_staff_select
ON public.patients FOR SELECT TO authenticated
USING (
    (SELECT public.buk_current_role()) IN ('records', 'nurse', 'doctor')
);

CREATE POLICY patients_records_insert
ON public.patients FOR INSERT TO authenticated
WITH CHECK ((SELECT public.buk_current_role()) = 'records');

CREATE POLICY patients_records_update
ON public.patients FOR UPDATE TO authenticated
USING ((SELECT public.buk_current_role()) = 'records')
WITH CHECK ((SELECT public.buk_current_role()) = 'records');

-- VISITS: Records manages queue; Nurse and Doctor handle clinical visits.
CREATE POLICY visits_staff_select
ON public.visits FOR SELECT TO authenticated
USING (
    (SELECT public.buk_current_role()) IN ('records', 'nurse', 'doctor')
    OR EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = visits.patient_id
          AND p.matric = (SELECT public.buk_current_student_matric())
    )
);

CREATE POLICY visits_records_insert
ON public.visits FOR INSERT TO authenticated
WITH CHECK ((SELECT public.buk_current_role()) = 'records');

CREATE POLICY visits_clinical_update
ON public.visits FOR UPDATE TO authenticated
USING ((SELECT public.buk_current_role()) IN ('records', 'nurse', 'doctor'))
WITH CHECK ((SELECT public.buk_current_role()) IN ('records', 'nurse', 'doctor'));

-- VITALS: Nurse records/updates vitals; Doctor and Records can read them.
CREATE POLICY vitals_staff_select
ON public.vitals FOR SELECT TO authenticated
USING ((SELECT public.buk_current_role()) IN ('records', 'nurse', 'doctor'));

CREATE POLICY vitals_nurse_insert
ON public.vitals FOR INSERT TO authenticated
WITH CHECK (
    (SELECT public.buk_current_role()) = 'nurse'
    AND nurse_id = (SELECT auth.uid())
);

CREATE POLICY vitals_nurse_update
ON public.vitals FOR UPDATE TO authenticated
USING ((SELECT public.buk_current_role()) = 'nurse')
WITH CHECK ((SELECT public.buk_current_role()) = 'nurse');

-- CONSULTATIONS: Doctor writes; Doctor/Records can read patient history.
CREATE POLICY consultations_staff_select
ON public.consultations FOR SELECT TO authenticated
USING ((SELECT public.buk_current_role()) IN ('records', 'doctor'));

CREATE POLICY consultations_doctor_insert
ON public.consultations FOR INSERT TO authenticated
WITH CHECK (
    (SELECT public.buk_current_role()) = 'doctor'
    AND doctor_id = (SELECT auth.uid())
);

CREATE POLICY consultations_doctor_update
ON public.consultations FOR UPDATE TO authenticated
USING ((SELECT public.buk_current_role()) = 'doctor')
WITH CHECK ((SELECT public.buk_current_role()) = 'doctor');

-- DIAGNOSTICS: Doctor creates/reads requests; Diagnostics staff process them.
CREATE POLICY diagnostics_select
ON public.diagnostic_requests FOR SELECT TO authenticated
USING ((SELECT public.buk_current_role()) IN ('records', 'doctor', 'diagnostics'));

CREATE POLICY diagnostics_doctor_insert
ON public.diagnostic_requests FOR INSERT TO authenticated
WITH CHECK (
    (SELECT public.buk_current_role()) = 'doctor'
    AND requested_by = (SELECT auth.uid())
);

CREATE POLICY diagnostics_staff_update
ON public.diagnostic_requests FOR UPDATE TO authenticated
USING ((SELECT public.buk_current_role()) IN ('doctor', 'diagnostics'))
WITH CHECK ((SELECT public.buk_current_role()) IN ('doctor', 'diagnostics'));

-- PHARMACY INVENTORY: Pharmacy manages stock; other staff cannot read it.
CREATE POLICY medicines_pharmacy_all
ON public.medicines FOR ALL TO authenticated
USING ((SELECT public.buk_current_role()) = 'pharmacy')
WITH CHECK ((SELECT public.buk_current_role()) = 'pharmacy');

CREATE POLICY supplies_pharmacy_all
ON public.medical_supplies FOR ALL TO authenticated
USING ((SELECT public.buk_current_role()) = 'pharmacy')
WITH CHECK ((SELECT public.buk_current_role()) = 'pharmacy');

-- PRESCRIPTIONS: Doctor creates; Doctor/Pharmacy read; Pharmacy processes.
CREATE POLICY prescriptions_staff_select
ON public.prescriptions FOR SELECT TO authenticated
USING ((SELECT public.buk_current_role()) IN ('records', 'doctor', 'pharmacy'));

CREATE POLICY prescriptions_doctor_insert
ON public.prescriptions FOR INSERT TO authenticated
WITH CHECK ((SELECT public.buk_current_role()) = 'doctor');

CREATE POLICY prescriptions_pharmacy_update
ON public.prescriptions FOR UPDATE TO authenticated
USING ((SELECT public.buk_current_role()) = 'pharmacy')
WITH CHECK ((SELECT public.buk_current_role()) = 'pharmacy');

-- INVENTORY MOVEMENTS: Pharmacy records and reviews stock movements.
CREATE POLICY inventory_movements_pharmacy_all
ON public.inventory_movements FOR ALL TO authenticated
USING ((SELECT public.buk_current_role()) = 'pharmacy')
WITH CHECK (
    (SELECT public.buk_current_role()) = 'pharmacy'
    AND recorded_by = (SELECT auth.uid())
);

-- AUDIT LOGS: authenticated users can create logs for themselves;
-- only Records role can read logs. No update/delete policy is provided.
CREATE POLICY audit_logs_insert_own
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY audit_logs_records_select
ON public.audit_logs FOR SELECT TO authenticated
USING ((SELECT public.buk_current_role()) = 'records');

-- IMPORTANT:
-- RLS does not replace table privileges, Auth account provisioning,
-- Storage policies, or frontend validation. Test every role with test accounts
-- before using real patient information.
