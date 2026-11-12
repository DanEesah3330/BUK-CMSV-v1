-- 3. Registered Patients

CREATE SEQUENCE public.clinic_number_seq START 1;

CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    clinic_number TEXT UNIQUE NOT NULL DEFAULT
        'BUK-CLN-' || LPAD(nextval('public.clinic_number_seq')::TEXT, 4, '0'),

    matric TEXT UNIQUE REFERENCES public.students_registry(matric),

    full_name TEXT NOT NULL,
    phone TEXT,
    sex TEXT CHECK (sex IN ('Male', 'Female')),
    date_of_birth DATE,
    graduation_year TEXT,
    next_of_kin_phone TEXT,
    next_of_kin_name TEXT,
    next_of_kin_relationship TEXT,
    next_of_kin_address TEXT,

    place_of_origin TEXT,
    tribe TEXT,
    religion TEXT,
    occupation TEXT,
    allergy TEXT,
    passport_photo_path TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);