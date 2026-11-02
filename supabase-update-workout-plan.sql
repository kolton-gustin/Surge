-- Run this after supabase-workout-library.sql in the Supabase SQL Editor.
-- It adds superset support and replaces the four standard templates with the plan below.
-- Completed and active workout sessions are not changed.

begin;

alter table public.workout_template_exercises add column if not exists superset_group text;
alter table public.session_exercises add column if not exists superset_group text;

update public.workout_templates
set name = case template_key
  when 'upper_a' then 'Press'
  when 'lower_a' then 'Squat'
  when 'upper_b' then 'Pull'
  when 'lower_b' then 'Deadlift'
end,
description = case template_key
  when 'upper_a' then 'Upper A · Press'
  when 'lower_a' then 'Lower A · Squat'
  when 'upper_b' then 'Upper B · Pull'
  when 'lower_b' then 'Lower B · Deadlift'
end,
position = case template_key when 'upper_a' then 0 when 'lower_a' then 1 when 'upper_b' then 2 when 'lower_b' then 3 end
where template_key in ('upper_a', 'lower_a', 'upper_b', 'lower_b');

delete from public.workout_template_exercises
where template_id in (select id from public.workout_templates where template_key in ('upper_a', 'lower_a', 'upper_b', 'lower_b'));

insert into public.workout_template_exercises
  (template_id, exercise_key, exercise_name, position, target_sets, target_rep_min, target_rep_max, rest_seconds, superset_group)
select t.id, e.exercise_key, e.exercise_name, e.position, e.target_sets, e.rep_min, e.rep_max, e.rest_seconds, e.superset_group
from public.workout_templates t
join (values
  -- Upper A: Press
  ('upper_a','bench_press','Bench press',0,3,6,8,150,null),
  ('upper_a','barbell_or_chest_supported_row','Barbell or chest-supported row',1,3,6,8,120,null),
  ('upper_a','overhead_press','Overhead press',2,3,8,10,120,null),
  ('upper_a','lat_pulldown','Lat pulldown',3,3,8,10,90,null),
  ('upper_a','triceps_pushdown','Triceps pushdown',4,2,10,12,75,'A'),
  ('upper_a','curl','Curl',5,2,10,12,75,'A'),
  -- Lower A: Squat
  ('lower_a','back_squat','Back squat',0,3,5,7,150,null),
  ('lower_a','romanian_deadlift','Romanian deadlift',1,3,8,10,120,null),
  ('lower_a','leg_press_or_walking_lunges','Leg press or walking lunges',2,2,10,12,90,null),
  ('lower_a','leg_curl','Leg curl',3,2,10,12,75,null),
  ('lower_a','calf_raise','Calf raise',4,3,12,15,60,null),
  -- Upper B: Pull
  ('upper_b','incline_dumbbell_press','Incline dumbbell press',0,3,8,10,90,null),
  ('upper_b','pull_ups_or_assisted_pulldown','Pull-ups (or assisted / pulldown)',1,3,6,10,120,null),
  ('upper_b','seated_cable_row','Seated cable row',2,3,10,12,90,null),
  ('upper_b','dumbbell_shoulder_press','Dumbbell shoulder press',3,2,10,12,90,null),
  ('upper_b','lateral_raise','Lateral raise',4,2,12,15,60,'A'),
  ('upper_b','face_pull','Face pull',5,2,12,15,60,'A'),
  ('upper_b','curl','Curl',6,2,10,12,60,'B'),
  ('upper_b','overhead_triceps_extension','Overhead triceps extension',7,2,10,12,60,'B'),
  -- Lower B: Deadlift
  ('lower_b','deadlift_or_trap_bar_deadlift','Deadlift or trap bar deadlift',0,3,4,6,180,null),
  ('lower_b','front_squat_or_leg_press','Front squat or leg press',1,3,8,10,120,null),
  ('lower_b','bulgarian_split_squat','Bulgarian split squat (per leg)',2,2,8,10,90,null),
  ('lower_b','hip_thrust_or_back_extension','Hip thrust or back extension',3,2,10,12,90,null),
  ('lower_b','hanging_leg_raise_or_cable_crunch','Hanging leg raise or cable crunch',4,3,10,15,60,null)
) as e(template_key, exercise_key, exercise_name, position, target_sets, rep_min, rep_max, rest_seconds, superset_group)
on t.template_key = e.template_key;

commit;
