-- AquaCare: cover photo and start date for each tank (shown on the home cards).
alter table tanks add column if not exists photo_path text;
alter table tanks add column if not exists started_at date;
