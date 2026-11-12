-- ==========================================
-- BUK Care Database
-- 1. Staff Profiles Table
-- ==========================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    full_name TEXT NOT NULL,

    role TEXT NOT NULL CHECK (
        role IN (
        'student',
        'records',
        'nurse',
        'doctor',
        'diagnostics',
        'pharmacy'
        )
    ),

    created_at TIMESTAMPTZ DEFAULT NOW()
);