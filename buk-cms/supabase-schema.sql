-- =============================================================
-- BUK-CMS — Supabase schema (matches js/data.js)
-- Run this in your Supabase project's SQL editor.
-- =============================================================

-- Everyone who signs in (Records Officer, Nurse, Doctor, Pharmacist/Lab Officer)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('records','nurse','doctor','pharmacy')),
  created_at timestamptz default now()
);

-- Simulated BUK student registry (students only, per the approved proposal)
create table students_registry (
  matric text primary key,
  name text not null,
  department text not null,
  sex text not null check (sex in ('Male','Female'))
);

-- One row per patient. clinic_number is generated automatically, like BUK-0001.
create sequence clinic_seq start 1;
create table patients (
  clinic_number text primary key default 'BUK-' || lpad(nextval('clinic_seq')::text, 4, '0'),
  matric text unique references students_registry(matric),
  phone text,
  sex text,
  dob date,
  grad_year text,
  kin_phone text,
  allergy text,            -- drug reaction flagged by a doctor; shown at every future visit
  created_at timestamptz default now()
);

-- One row per clinic visit. status is the queue: Waiting -> Triaged -> At lab / At pharmacy -> Done.
create table visits (
  id uuid primary key default gen_random_uuid(),
  clinic_number text references patients(clinic_number),
  priority text not null default 'Normal' check (priority in ('Normal','Emergency')),
  status text not null default 'Waiting'
    check (status in ('Waiting','Triaged','At lab','At pharmacy','Done','Absent')),
  vitals jsonb,             -- { bp, temp, resp, ox, sugar }
  complaint text,
  diagnosis text,
  created_at timestamptz default now()
);

create table lab_requests (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(id) on delete cascade,
  test text not null,       -- 'Laboratory test' or 'X-ray / scan (optional)'
  result text,
  created_at timestamptz default now()
);

create table drugs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  main_qty int not null default 0,
  active_qty int not null default 0,
  dispensary_qty int not null default 0,
  expiry date
);

create table prescriptions (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(id) on delete cascade,
  drug_id uuid references drugs(id),
  dosage text,
  dispensed boolean default false,
  created_at timestamptz default now()
);

-- Starting data so the prototype is not empty on first run
insert into students_registry (matric, name, department, sex) values
 ('CST/23/SWE/01131','Abdullahi Isah','Software Engineering','Male'),
 ('CST/23/SWE/01150','Hafsat Musa','Software Engineering','Female'),
 ('CST/22/CSC/00420','Adamu Adamu','Computer Science','Male');

insert into drugs (name, main_qty, active_qty, dispensary_qty, expiry) values
 ('Paracetamol 500mg',400,120,60,'2027-08-01'),
 ('Amoxicillin 500mg',150,40,8,'2026-11-15'),
 ('Artemether/Lumefantrine',90,30,25,'2026-10-20'),
 ('Fortide Inhaler',20,6,3,'2027-03-01');

-- =============================================================
-- Row Level Security — enable and add policies before your defense.
-- These are starting points; a reviewer will likely test them.
-- =============================================================
create function my_role() returns text
language sql stable security definer set search_path = public
as $$ select role from profiles where id = auth.uid() $$;

alter table profiles enable row level security;
alter table students_registry enable row level security;
alter table patients enable row level security;
alter table visits enable row level security;
alter table lab_requests enable row level security;
alter table drugs enable row level security;
alter table prescriptions enable row level security;

create policy "read own profile" on profiles for select using (id = auth.uid());

create policy "records officer reads registry" on students_registry
  for select using (my_role() = 'records');

create policy "any signed-in staff reads patients" on patients
  for select using (my_role() is not null);
create policy "records officer adds patients" on patients
  for insert with check (my_role() = 'records');
create policy "records officer and doctor update patients" on patients
  for update using (my_role() in ('records','doctor'));

create policy "any signed-in staff reads visits" on visits
  for select using (my_role() is not null);
create policy "records officer adds visits" on visits
  for insert with check (my_role() = 'records');
create policy "any signed-in staff updates visits" on visits
  for update using (my_role() is not null);
  -- Tighter version to try once the demo works:
  -- nurse can only move Waiting -> Triaged, doctor only Triaged -> At lab/At pharmacy, etc.

create policy "doctor and pharmacy read lab requests" on lab_requests
  for select using (my_role() in ('doctor','pharmacy'));
create policy "doctor creates lab requests" on lab_requests
  for insert with check (my_role() = 'doctor');
create policy "pharmacy enters lab result" on lab_requests
  for update using (my_role() = 'pharmacy');

create policy "any signed-in staff reads drugs" on drugs
  for select using (my_role() is not null);
create policy "pharmacy updates drug stock" on drugs
  for update using (my_role() = 'pharmacy');

create policy "doctor and pharmacy read prescriptions" on prescriptions
  for select using (my_role() in ('doctor','pharmacy'));
create policy "doctor writes prescriptions" on prescriptions
  for insert with check (my_role() = 'doctor');
create policy "pharmacy dispenses" on prescriptions
  for update using (my_role() = 'pharmacy');
