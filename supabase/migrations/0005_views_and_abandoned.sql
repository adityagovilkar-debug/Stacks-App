-- =====================================================================
-- Stacks — smart shelves (saved views) + an "abandoned" read status
-- Run this in the Supabase SQL editor after 0003_on_hold.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- "abandoned" (DNF) read status — a book you've decided to stop. Keeps
-- its progress but stays out of active reading + stats (like on_hold).
-- ---------------------------------------------------------------------
alter table books drop constraint if exists books_read_status_check;
alter table books add constraint books_read_status_check
  check (read_status in ('unread', 'reading', 'on_hold', 'abandoned', 'read'));

-- ---------------------------------------------------------------------
-- saved_views — a named library filter combination ("smart shelf").
-- The whole filter state is stored as JSON so it can evolve freely.
-- ---------------------------------------------------------------------
create table if not exists saved_views (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  query       jsonb not null default '{}',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_saved_views_user on saved_views(user_id, sort_order);

alter table saved_views enable row level security;
drop policy if exists saved_views_owner on saved_views;
create policy saved_views_owner on saved_views
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
