-- =====================================================================
-- Stacks — quotes/highlights + audiobook progress
-- Run this in the Supabase SQL editor after 0001_init.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- quotes — favourite passages / highlights captured per book
-- (a personal commonplace book). Owner-only RLS.
-- ---------------------------------------------------------------------
create table if not exists quotes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  book_id     uuid not null references books on delete cascade,
  text        text not null,
  page        int,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_quotes_user on quotes(user_id, created_at desc);
create index if not exists idx_quotes_book on quotes(book_id);

alter table quotes enable row level security;
drop policy if exists quotes_owner on quotes;
create policy quotes_owner on quotes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Audiobook progress: total length + current position, both in minutes.
-- (Page-based books keep using page_count / current_page.)
-- ---------------------------------------------------------------------
alter table books add column if not exists duration_minutes       int;
alter table books add column if not exists audio_position_minutes  int;
