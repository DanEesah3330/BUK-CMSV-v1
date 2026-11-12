-- 15. BUK Care Activity Logs

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID REFERENCES public.profiles(id),

    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    description TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);