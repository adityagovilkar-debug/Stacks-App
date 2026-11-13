-- =====================================================================
-- Stacks — Phase 3 (library depth). Run after 0009_notes_and_rest_days.sql.
-- Safe to run more than once.
-- =====================================================================

-- Editions: copies of the same work share a work_id, so they show as
-- "2 editions" instead of being flagged as accidental duplicates.
alter table books add column if not exists work_id uuid;
create index if not exists idx_books_work on books(user_id, work_id);

-- Recommendations ledger, both ways:
--   direction 'from' = someone recommended this book to you
--   direction 'to'   = you recommended / shared it with someone
create table if not exists recommendations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  book_id     uuid not null references books on delete cascade,
  person      text not null,
  direction   text not null check (direction in ('from', 'to')),
  on_date     date not null default current_date,
  channel     text,          -- whatsapp / email / in person / …
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_recs_user on recommendations(user_id, on_date desc);
create index if not exists idx_recs_book on recommendations(book_id);

alter table recommendations enable row level security;
drop policy if exists recommendations_owner on recommendations;
create policy recommendations_owner on recommendations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
