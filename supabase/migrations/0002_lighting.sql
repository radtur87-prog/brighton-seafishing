-- AquaCare: lighting schedules (kedy a ako dlho svieti osvetlenie akvária)

create table if not exists lighting_schedules (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid not null references tanks (id) on delete cascade,
  start_time time not null,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 1440),
  days_of_week int[] not null default '{0,1,2,3,4,5,6}', -- 0=Nedeľa .. 6=Sobota
  enabled boolean not null default true,
  notification_on_id text,
  notification_off_id text,
  created_at timestamptz not null default now()
);

alter table lighting_schedules enable row level security;

create policy "Users manage lighting schedules on their own tanks"
  on lighting_schedules for all
  using (exists (select 1 from tanks where tanks.id = lighting_schedules.tank_id and tanks.user_id = auth.uid()))
  with check (exists (select 1 from tanks where tanks.id = lighting_schedules.tank_id and tanks.user_id = auth.uid()));
