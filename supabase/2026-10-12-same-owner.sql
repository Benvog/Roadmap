-- Vektor: a child row must belong to the same user as its parent.
-- Run once in the Supabase SQL editor, after schema.sql.
--
-- schema.sql only checks that a new row carries the signed-in user's own user_id. That left a gap:
-- a signed-in user who knew another user's row id could attach their own rows underneath it.
-- These constraints close it in the database itself: the (parent id, user_id) pair has to match.

alter table public.areas add constraint areas_id_user_key unique (id, user_id);
alter table public.goals add constraint goals_id_user_key unique (id, user_id);
alter table public.milestones add constraint milestones_id_user_key unique (id, user_id);
alter table public.habits add constraint habits_id_user_key unique (id, user_id);

alter table public.goals add constraint goals_area_owner_fkey
  foreign key (area_id, user_id) references public.areas (id, user_id) on delete cascade;
alter table public.goals add constraint goals_parent_owner_fkey
  foreign key (parent_id, user_id) references public.goals (id, user_id) on delete cascade;
alter table public.milestones add constraint milestones_goal_owner_fkey
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete cascade;
alter table public.tasks add constraint tasks_milestone_owner_fkey
  foreign key (milestone_id, user_id) references public.milestones (id, user_id) on delete cascade;
alter table public.habits add constraint habits_area_owner_fkey
  foreign key (area_id, user_id) references public.areas (id, user_id) on delete cascade;
alter table public.habit_checkins add constraint habit_checkins_habit_owner_fkey
  foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade;
alter table public.entries add constraint entries_goal_owner_fkey
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete cascade;
alter table public.funding add constraint funding_milestone_owner_fkey
  foreign key (milestone_id, user_id) references public.milestones (id, user_id) on delete cascade;
-- If the path a funding row came from is deleted, clear only that link, never the owner.
alter table public.funding add constraint funding_from_goal_owner_fkey
  foreign key (from_goal_id, user_id) references public.goals (id, user_id) on delete set null (from_goal_id);
