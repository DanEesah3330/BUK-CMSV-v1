-- 12. Pharmacy Inventory Movements

CREATE TABLE public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    item_type TEXT NOT NULL
        CHECK (item_type IN ('Medicine', 'Supply')),

    medicine_id UUID REFERENCES public.medicines(id),
    supply_id UUID REFERENCES public.medical_supplies(id),

    movement_type TEXT NOT NULL
        CHECK (movement_type IN ('Stock In', 'Stock Out', 'Adjustment')),

    quantity INTEGER NOT NULL CHECK (quantity > 0),

    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id),

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