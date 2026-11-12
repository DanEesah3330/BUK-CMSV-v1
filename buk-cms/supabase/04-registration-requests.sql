-- 4. Student Clinic Registration Requests

CREATE TABLE public.clinic_registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    matric TEXT NOT NULL
        REFERENCES public.students_registry(matric),

    full_name TEXT NOT NULL,
    phone TEXT,
    sex TEXT CHECK (sex IN ('Male', 'Female')),
    date_of_birth DATE,
    department TEXT,
    graduation_year TEXT,

    next_of_kin_name TEXT,
    next_of_kin_relationship TEXT,
    next_of_kin_phone TEXT,
    next_of_kin_address TEXT,

    place_of_origin TEXT,
    tribe TEXT,
    religion TEXT,
    occupation TEXT,
    allergy TEXT,

    admission_letter_path TEXT,
    passport_photo_path TEXT,
    health_service_form_path TEXT,
    medical_certificate_path TEXT,

    status TEXT NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Approved', 'Rejected')),

    rejection_reason TEXT,

    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);