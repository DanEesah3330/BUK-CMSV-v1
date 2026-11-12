-- 11. Patient Prescriptions

CREATE TABLE public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    visit_id UUID NOT NULL
        REFERENCES public.visits(id) ON DELETE CASCADE,

    item_type TEXT NOT NULL
        CHECK (item_type IN ('Medicine', 'Supply')),

    medicine_id UUID REFERENCES public.medicines(id),
    supply_id UUID REFERENCES public.medical_supplies(id),

    dosage TEXT,
    frequency TEXT,
    duration TEXT,

    quantity INTEGER NOT NULL DEFAULT 1
        CHECK (quantity > 0),

    status TEXT NOT NULL DEFAULT 'Pending'
        CHECK (status IN (
            'Pending',
            'Dispensed',
            'Unavailable'
        )),

    dispensed_by UUID REFERENCES public.profiles(id),
    dispensed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CHECK (
        (item_type = 'Medicine'
            AND medicine_id IS NOT NULL
            AND supply_id IS NULL)
        OR
        (item_type = 'Supply'
            AND supply_id IS NOT NULL
            AND medicine_id IS NULL)
    )
);