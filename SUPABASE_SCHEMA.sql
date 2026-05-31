-- Run this entire file in Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- FACILITIES
create table if not exists facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#534AB7',
  position integer not null default 0,
  created_at timestamptz default now()
);

-- ITEMS (projects & events)
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references facilities(id) on delete cascade,
  name text not null,
  type text not null check (type in ('project','event')),
  responsibility text not null check (responsibility in ('Marketing','Employee retention','Recruitment','Other')),
  due_date date,
  assigned_to text,
  progress integer not null default 0,
  manual_progress boolean not null default false,
  created_at timestamptz default now()
);

-- STEPS
create table if not exists steps (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id) on delete cascade,
  name text not null,
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz default now()
);

-- TASKS
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id) on delete cascade,
  step_id uuid references steps(id) on delete set null,
  name text not null,
  due_date date,
  assigned_to text,
  priority text not null default 'Medium' check (priority in ('High','Medium','Low')),
  notes text,
  done boolean not null default false,
  created_at timestamptz default now()
);

-- NOTES
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);

-- IDEAS
create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  responsibility text not null,
  body text,
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS) -- only authenticated users can access
alter table facilities enable row level security;
alter table items enable row level security;
alter table steps enable row level security;
alter table tasks enable row level security;
alter table notes enable row level security;
alter table ideas enable row level security;

-- RLS Policies: authenticated users can do everything
create policy "Auth users full access" on facilities for all to authenticated using (true) with check (true);
create policy "Auth users full access" on items for all to authenticated using (true) with check (true);
create policy "Auth users full access" on steps for all to authenticated using (true) with check (true);
create policy "Auth users full access" on tasks for all to authenticated using (true) with check (true);
create policy "Auth users full access" on notes for all to authenticated using (true) with check (true);
create policy "Auth users full access" on ideas for all to authenticated using (true) with check (true);

-- Seed facilities
insert into facilities (name, color, position) values
  ('The Pearl', '#534AB7', 0),
  ('Champion City', '#1D9E75', 1),
  ('Platinum Ridge', '#D85A30', 2),
  ('Aristos', '#185FA5', 3),
  ('Alpine', '#854F0B', 4),
  ('Highland Park', '#A32D2D', 5);

-- ADD completed column to items (run this if you already ran the schema above)
alter table items add column if not exists completed boolean not null default false;
alter table items add column if not exists completed_at timestamptz;
