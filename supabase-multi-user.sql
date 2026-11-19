-- Run this once in the Supabase SQL Editor after the existing Surge SQL scripts.
-- It enables per-user ownership, Supabase Auth row-level security, and workout types.
-- Existing rows are intentionally left unowned until you assign them in the
-- optional migration block at the bottom; unowned rows are hidden from everyone.

begin;

alter table public.workout_templates add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.workout_template_exercises add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.workout_sessions add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.session_exercises add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.workout_sets add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.goals add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.body_measurements add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

alter table public.workout_templates add column if not exists workout_type text not null default 'Lift' check (workout_type in ('Lift', 'Run'));
alter table public.workout_sessions add column if not exists workout_type text not null default 'Lift' check (workout_type in ('Lift', 'Run'));

-- template_key used to be globally unique. Each account now has its own library.
alter table public.workout_templates drop constraint if exists workout_templates_template_key_key;
create unique index if not exists workout_templates_owner_key_unique on public.workout_templates (user_id, template_key);

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('workout_templates', 'workout_template_exercises', 'workout_sessions', 'session_exercises', 'workout_sets', 'goals', 'body_measurements')
  loop
    execute format('drop policy if exists %I on %I.%I', existing_policy.policyname, existing_policy.schemaname, existing_policy.tablename);
  end loop;
end;
$$;

alter table public.workout_templates enable row level security;
alter table public.workout_template_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.goals enable row level security;
alter table public.body_measurements enable row level security;

revoke all on public.workout_templates, public.workout_template_exercises, public.workout_sessions, public.session_exercises, public.workout_sets, public.goals, public.body_measurements from anon;
grant select, insert, update, delete on public.workout_templates, public.workout_template_exercises, public.workout_sessions, public.session_exercises, public.workout_sets, public.goals, public.body_measurements to authenticated;

create policy surge_owner_access on public.workout_templates for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy surge_owner_access on public.workout_template_exercises for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy surge_owner_access on public.workout_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy surge_owner_access on public.session_exercises for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy surge_owner_access on public.workout_sets for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy surge_owner_access on public.goals for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy surge_owner_access on public.body_measurements for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

commit;

-- OPTIONAL: claim the data from the old single-user version for its owner.
-- First create/sign in to that account, copy its UUID from Authentication > Users,
-- replace 8d92782c-40d4-4fb0-bc49-0e309350637d below, then run this block separately. Do not run it after
-- inviting other people: it assigns every still-unowned legacy row to one account.
--
update public.workout_templates set user_id = '8d92782c-40d4-4fb0-bc49-0e309350637d' where user_id is null;
update public.workout_template_exercises set user_id = '8d92782c-40d4-4fb0-bc49-0e309350637d' where user_id is null;
update public.workout_sessions set user_id = '8d92782c-40d4-4fb0-bc49-0e309350637d' where user_id is null;
update public.session_exercises set user_id = '8d92782c-40d4-4fb0-bc49-0e309350637d' where user_id is null;
update public.workout_sets set user_id = '8d92782c-40d4-4fb0-bc49-0e309350637d' where user_id is null;
update public.goals set user_id = '8d92782c-40d4-4fb0-bc49-0e309350637d' where user_id is null;
update public.body_measurements set user_id = '8d92782c-40d4-4fb0-bc49-0e309350637d' where user_id is null;
