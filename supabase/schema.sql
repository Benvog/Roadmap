-- Vektor: tables and privacy rules. See docs/DATA-MODEL.md.
-- Run once, on a new project, in the Supabase SQL editor.

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- One table, three roles: a plain goal, a target (target_amount set), or a path (parent_id set).
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  area_id uuid not null references public.areas (id) on delete cascade,
  parent_id uuid references public.goals (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  target_amount numeric(14, 2) check (target_amount > 0),
  unit text not null default 'KES',
  due_date date,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check (parent_id is null or target_amount is null)  -- a path is not itself a target
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  due_date date,
  position integer not null default 0,
  done_at timestamptz,
  fund_amount numeric(14, 2) check (fund_amount > 0),  -- set when the milestone is locked until funded
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  milestone_id uuid not null references public.milestones (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  position integer not null default 0,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  area_id uuid not null references public.areas (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  position integer not null default 0,
  times_per_week smallint not null default 7 check (times_per_week between 1 and 7),  -- 7 = every day
  created_at timestamptz not null default now()
);

-- The app always sends `day` (the date on the phone); the default is only a fallback and is in UTC.
create table public.habit_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  day date not null default current_date,
  created_at timestamptz not null default now(),
  unique (habit_id, day)
);

-- An amount logged on a path.
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  note text check (char_length(note) <= 60),
  logged_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- Money put toward a locked milestone. from_goal_id is the path it came from; empty means other cash.
create table public.funding (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  milestone_id uuid not null references public.milestones (id) on delete cascade,
  from_goal_id uuid references public.goals (id) on delete set null,
  amount numeric(14, 2) not null check (amount > 0),
  note text check (char_length(note) <= 60),
  logged_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index on public.areas (user_id);
create index on public.goals (user_id);
create index on public.goals (area_id);
create index on public.goals (parent_id);
create index on public.milestones (user_id);
create index on public.milestones (goal_id);
create index on public.tasks (user_id);
create index on public.tasks (milestone_id);
create index on public.habits (user_id);
create index on public.habits (area_id);
create index on public.habit_checkins (user_id);
create index on public.entries (user_id);
create index on public.entries (goal_id);
create index on public.funding (user_id);
create index on public.funding (milestone_id);
create index on public.funding (from_goal_id);

-- Privacy: signed-in users can read and change only their own rows. Signed-out visitors get nothing.
do $$
declare
  t text;
begin
  foreach t in array array['areas', 'goals', 'milestones', 'tasks', 'habits', 'habit_checkins', 'entries', 'funding']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;
