-- 5. Patient Visits and Queue

CREATE TABLE public.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    patient_id UUID NOT NULL
        REFERENCES public.patients(id) ON DELETE CASCADE,

    complaint TEXT,

    priority TEXT DEFAULT 'Normal'
        CHECK (priority IN ('Normal', 'Urgent', 'Emergency')),

    status TEXT NOT NULL DEFAULT 'Waiting'
        CHECK (status IN (
            'Waiting',
            'Triaged',
            'Doctor Absent',
            'At diagnostics',
            'At pharmacy',
            'Completed',
            'Cancelled',
            'Absent'
        )),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);