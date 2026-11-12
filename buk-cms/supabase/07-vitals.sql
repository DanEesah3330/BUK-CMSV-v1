-- 7. Patient Vitals

CREATE TABLE public.vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    visit_id UUID NOT NULL
        REFERENCES public.visits(id) ON DELETE CASCADE,

    nurse_id UUID REFERENCES public.profiles(id),

    blood_pressure TEXT,
    temperature NUMERIC(4,1),
    pulse_rate INTEGER,
    respiratory_rate INTEGER,
    oxygen_saturation NUMERIC(5,2),
    weight NUMERIC(5,2),
    height NUMERIC(5,2),

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);