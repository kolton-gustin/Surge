-- Run this once in the Supabase SQL Editor for the Gym App project.
-- This preserves existing workout data while removing single-user ownership columns
-- and allowing the app's public anon key to read and write these tables.

begin;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'workout_sessions',
        'session_exercises',
        'workout_sets',
        'goals',
        'body_measurements'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  end loop;
end;
$$;

-- Remove ownership foreign keys and the old composite parent/child links that
-- included user_id. The latter are replaced below with ID-only relationships.
do $$
declare
  dependent_fk record;
begin
  for dependent_fk in
    select child_ns.nspname as child_schema, child.relname as child_table, c.conname
    from pg_constraint c
    join pg_class child on child.oid = c.conrelid
    join pg_namespace child_ns on child_ns.oid = child.relnamespace
    join pg_class parent on parent.oid = c.confrelid
    join pg_namespace parent_ns on parent_ns.oid = parent.relnamespace
    where c.contype = 'f'
      and (
        (
          child_ns.nspname = 'public'
          and child.relname in ('workout_sessions', 'session_exercises', 'workout_sets', 'goals', 'body_measurements')
          and (
            exists (
              select 1
              from unnest(c.conkey) as child_key(attnum)
              join pg_attribute a on a.attrelid = c.conrelid and a.attnum = child_key.attnum
              where a.attname = 'user_id'
            )
            or (child.relname = 'session_exercises' and parent_ns.nspname = 'public' and parent.relname = 'workout_sessions')
            or (child.relname = 'workout_sets' and parent_ns.nspname = 'public' and parent.relname = 'session_exercises')
          )
        )
        or (
          parent_ns.nspname = 'public'
          and parent.relname in ('workout_sessions', 'session_exercises', 'workout_sets', 'goals', 'body_measurements')
          and exists (
            select 1
            from unnest(c.confkey) as parent_key(attnum)
            join pg_attribute a on a.attrelid = c.confrelid and a.attnum = parent_key.attnum
            where a.attname = 'user_id'
          )
        )
      )
  loop
    execute format(
      'alter table %I.%I drop constraint %I',
      dependent_fk.child_schema,
      dependent_fk.child_table,
      dependent_fk.conname
    );
  end loop;
end;
$$;

alter table if exists public.workout_sessions drop column if exists user_id;
alter table if exists public.session_exercises drop column if exists user_id;
alter table if exists public.workout_sets drop column if exists user_id;
alter table if exists public.goals drop column if exists user_id;
alter table if exists public.body_measurements drop column if exists user_id;

alter table public.session_exercises
  add constraint session_exercises_session_fk
  foreign key (session_id) references public.workout_sessions(id) on delete cascade;
alter table public.workout_sets
  add constraint workout_sets_exercise_fk
  foreign key (session_exercise_id) references public.session_exercises(id) on delete cascade;

alter table public.workout_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.goals enable row level security;
alter table public.body_measurements enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.workout_sessions,
  public.session_exercises,
  public.workout_sets,
  public.goals,
  public.body_measurements
to anon, authenticated;

create policy gym_app_public_access on public.workout_sessions
  for all to anon, authenticated using (true) with check (true);
create policy gym_app_public_access on public.session_exercises
  for all to anon, authenticated using (true) with check (true);
create policy gym_app_public_access on public.workout_sets
  for all to anon, authenticated using (true) with check (true);
create policy gym_app_public_access on public.goals
  for all to anon, authenticated using (true) with check (true);
create policy gym_app_public_access on public.body_measurements
  for all to anon, authenticated using (true) with check (true);

commit;
