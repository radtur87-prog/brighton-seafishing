-- AquaCare schema: tanks, fish, schedules, task logs, photo analyses
-- Run this in the Supabase SQL editor (or via `supabase db push`) for your project.

create extension if not exists "uuid-ossp";

-- Tanks ----------------------------------------------------------------

create table if not exists tanks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  volume_liters numeric,
  water_type text not null default 'freshwater' check (water_type in ('freshwater', 'brackish', 'saltwater', 'pond')),
  notes text,
  created_at timestamptz not null default now()
);

alter table tanks enable row level security;

create policy "Users manage their own tanks"
  on tanks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Fish -------------------------------------------------------------------

create table if not exists fish (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid not null references tanks (id) on delete cascade,
  species text not null,
  nickname text,
  color text,
  count integer not null default 1,
  added_at timestamptz not null default now()
);

alter table fish enable row level security;

create policy "Users manage fish in their own tanks"
  on fish for all
  using (exists (select 1 from tanks where tanks.id = fish.tank_id and tanks.user_id = auth.uid()))
  with check (exists (select 1 from tanks where tanks.id = fish.tank_id and tanks.user_id = auth.uid()));

-- Feeding schedules --------------------------------------------------------

create table if not exists feeding_schedules (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid not null references tanks (id) on delete cascade,
  time_of_day time not null,
  days_of_week int[] not null default '{0,1,2,3,4,5,6}', -- 0=Sunday .. 6=Saturday
  food_type text,
  amount_note text,
  enabled boolean not null default true,
  notification_id text,
  created_at timestamptz not null default now()
);

alter table feeding_schedules enable row level security;

create policy "Users manage feeding schedules on their own tanks"
  on feeding_schedules for all
  using (exists (select 1 from tanks where tanks.id = feeding_schedules.tank_id and tanks.user_id = auth.uid()))
  with check (exists (select 1 from tanks where tanks.id = feeding_schedules.tank_id and tanks.user_id = auth.uid()));

-- Cleaning schedules ---------------------------------------------------------

create table if not exists cleaning_schedules (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid not null references tanks (id) on delete cascade,
  task_type text not null check (task_type in ('water_change', 'filter_clean', 'glass_clean', 'gravel_vacuum', 'other')),
  interval_days integer not null default 7,
  last_done_at timestamptz,
  next_due_at timestamptz not null default (now() + interval '7 days'),
  enabled boolean not null default true,
  notification_id text,
  created_at timestamptz not null default now()
);

alter table cleaning_schedules enable row level security;

create policy "Users manage cleaning schedules on their own tanks"
  on cleaning_schedules for all
  using (exists (select 1 from tanks where tanks.id = cleaning_schedules.tank_id and tanks.user_id = auth.uid()))
  with check (exists (select 1 from tanks where tanks.id = cleaning_schedules.tank_id and tanks.user_id = auth.uid()));

-- Task logs (history of completed feeding/cleaning actions) ------------------

create table if not exists task_logs (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid not null references tanks (id) on delete cascade,
  task_type text not null,
  done_at timestamptz not null default now(),
  note text
);

alter table task_logs enable row level security;

create policy "Users manage task logs on their own tanks"
  on task_logs for all
  using (exists (select 1 from tanks where tanks.id = task_logs.tank_id and tanks.user_id = auth.uid()))
  with check (exists (select 1 from tanks where tanks.id = task_logs.tank_id and tanks.user_id = auth.uid()));

-- Photo analyses ------------------------------------------------------------

create table if not exists photo_analyses (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid references tanks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  photo_path text not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'error')),
  summary text,
  risk_level text check (risk_level in ('ok', 'watch', 'urgent')),
  findings jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

alter table photo_analyses enable row level security;

create policy "Users manage their own photo analyses"
  on photo_analyses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage bucket for tank photos --------------------------------------------

insert into storage.buckets (id, name, public)
values ('tank-photos', 'tank-photos', false)
on conflict (id) do nothing;

create policy "Users manage their own tank photos"
  on storage.objects for all
  using (bucket_id = 'tank-photos' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'tank-photos' and auth.uid()::text = (storage.foldername(name))[1]);
