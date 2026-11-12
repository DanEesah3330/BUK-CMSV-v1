-- 8. Laboratory and X-ray Requests

CREATE TABLE public.diagnostic_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    visit_id UUID NOT NULL
        REFERENCES public.visits(id) ON DELETE CASCADE,

    requested_by UUID REFERENCES public.profiles(id),

    request_type TEXT NOT NULL
        CHECK (request_type IN ('Lab', 'X-ray')),

    test_name TEXT NOT NULL,
    clinical_notes TEXT,
    result TEXT,

    status TEXT NOT NULL DEFAULT 'Pending'
        CHECK (status IN (
            'Pending',
            'In Progress',
            'Completed',
            'Cancelled'
        )),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);