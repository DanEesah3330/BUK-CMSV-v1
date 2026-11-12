-- 6. Doctor Consultation Records

CREATE TABLE public.consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    visit_id UUID NOT NULL UNIQUE
        REFERENCES public.visits(id) ON DELETE CASCADE,

    doctor_id UUID REFERENCES public.profiles(id),

    symptoms TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    doctor_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);