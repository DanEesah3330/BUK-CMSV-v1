
-- 2. Simulated BUK Student Registry

CREATE TABLE public.students_registry (
    matric TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female'))
);

-- Link student accounts to their matric numbers
ALTER TABLE public.profiles
ADD COLUMN student_matric TEXT UNIQUE
REFERENCES public.students_registry(matric);
