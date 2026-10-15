-- AquaCare: water test results (pH, GH, KH, NH3, NO2, NO3, Cl2, temperature) per tank.
-- Every value is optional so a partial test (e.g. only a strip without temperature) can be saved.

create table if not exists water_tests (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid not null references tanks (id) on delete cascade,
  measured_at timestamptz not null default now(),
  ph numeric,
  gh numeric,
  kh numeric,
  nh3 numeric,
  no2 numeric,
  no3 numeric,
  cl2 numeric,
  temp_c numeric,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists water_tests_tank_measured on water_tests (tank_id, measured_at);

alter table water_tests enable row level security;

drop policy if exists "Users manage water tests on their own tanks" on water_tests;
create policy "Users manage water tests on their own tanks"
  on water_tests for all
  using (exists (select 1 from tanks where tanks.id = water_tests.tank_id and tanks.user_id = auth.uid()))
  with check (exists (select 1 from tanks where tanks.id = water_tests.tank_id and tanks.user_id = auth.uid()));
