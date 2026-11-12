-- 9. Medicines Inventory

CREATE TABLE public.medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL UNIQUE,
    strength TEXT,
    dosage_form TEXT,

    quantity INTEGER NOT NULL DEFAULT 0
        CHECK (quantity >= 0),

    reorder_level INTEGER DEFAULT 10,
    expiry_date DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);