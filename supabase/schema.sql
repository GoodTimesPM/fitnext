-- FitNext sync: one row per user with the whole app state as JSON (see src/lib/sync.js).
-- Run this once in the Supabase dashboard: SQL Editor > New query > paste > Run.

create table if not exists public.fitnext_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row level security: a signed-in user reads and writes only their own row.
alter table public.fitnext_state enable row level security;

create policy "own row: read" on public.fitnext_state for select using (auth.uid() = user_id);
create policy "own row: insert" on public.fitnext_state for insert with check (auth.uid() = user_id);
create policy "own row: update" on public.fitnext_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row: delete" on public.fitnext_state for delete using (auth.uid() = user_id);

-- Signed-in users reach the table through the Data API. Needed when the project does not expose
-- new tables automatically; harmless when it does. Signed-out visitors (anon) get nothing.
grant select, insert, update, delete on public.fitnext_state to authenticated;
