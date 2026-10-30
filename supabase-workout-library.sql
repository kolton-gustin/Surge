-- Run after supabase-anon-access.sql in the Supabase SQL Editor.
-- This adds editable workout templates and seeds the four existing workouts.

begin;

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  name text not null,
  description text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_key text not null,
  exercise_name text not null,
  position integer not null,
  target_sets integer not null check (target_sets > 0),
  target_rep_min integer not null check (target_rep_min > 0),
  target_rep_max integer not null check (target_rep_max >= target_rep_min),
  rest_seconds integer not null default 90 check (rest_seconds >= 0),
  unique(template_id, position)
);

insert into public.workout_templates (template_key, name, description, position) values
  ('upper_a', 'Press', 'Bench and overhead pressing', 0),
  ('lower_a', 'Squat', 'Squats and lower body strength', 1),
  ('upper_b', 'Pull', 'Rows, pulldowns, and shoulders', 2),
  ('lower_b', 'Deadlift', 'Heavy hinges and leg work', 3)
on conflict (template_key) do nothing;

insert into public.workout_template_exercises (template_id, exercise_key, exercise_name, position, target_sets, target_rep_min, target_rep_max, rest_seconds)
select t.id, e.exercise_key, e.exercise_name, e.position, e.target_sets, e.target_rep_min, e.target_rep_max, e.rest_seconds
from public.workout_templates t
join (values
  ('upper_a','bench_press','Barbell bench press',0,3,6,8,120),('upper_a','barbell_row','Barbell row',1,3,8,10,90),('upper_a','overhead_press','Overhead press',2,3,6,8,120),('upper_a','lat_pulldown','Lat pulldown',3,3,8,12,75),('upper_a','lateral_raise','Dumbbell lateral raise',4,3,12,15,60),
  ('lower_a','back_squat','Back squat',0,3,5,7,150),('lower_a','romanian_deadlift','Romanian deadlift',1,3,8,10,120),('lower_a','leg_press','Leg press',2,3,10,12,90),('lower_a','leg_curl','Seated leg curl',3,3,10,12,75),('lower_a','calf_raise','Standing calf raise',4,3,12,15,60),
  ('upper_b','incline_db_press','Incline dumbbell press',0,3,8,10,90),('upper_b','lat_pulldown','Lat pulldown',1,3,8,10,90),('upper_b','seated_cable_row','Seated cable row',2,3,8,12,75),('upper_b','db_shoulder_press','Dumbbell shoulder press',3,3,8,10,75),('upper_b','face_pull','Face pull',4,3,12,15,60),
  ('lower_b','deadlift','Deadlift',0,3,4,6,180),('lower_b','front_squat','Front squat',1,3,6,8,120),('lower_b','hip_thrust','Barbell hip thrust',2,3,8,12,90),('lower_b','leg_extension','Leg extension',3,3,10,15,60),('lower_b','calf_raise','Seated calf raise',4,3,12,15,60)
) as e(template_key, exercise_key, exercise_name, position, target_sets, target_rep_min, target_rep_max, rest_seconds) on e.template_key = t.template_key
where not exists (select 1 from public.workout_template_exercises x where x.template_id = t.id);

alter table public.workout_templates enable row level security;
alter table public.workout_template_exercises enable row level security;
grant select, insert, update, delete on public.workout_templates, public.workout_template_exercises to anon, authenticated;
create policy workout_templates_public_access on public.workout_templates for all to anon, authenticated using (true) with check (true);
create policy workout_template_exercises_public_access on public.workout_template_exercises for all to anon, authenticated using (true) with check (true);

commit;
