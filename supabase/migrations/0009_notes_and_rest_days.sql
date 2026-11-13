-- =====================================================================
-- Stacks — Phase 2 (the reading loop). Run after 0008_archive_and_positions.sql.
-- Safe to run more than once.
-- =====================================================================

-- Notes while reading: dated thoughts on a book, separate from the final
-- review. Shown in the book's reading history. Kindle notes import here too.
create table if not exists book_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  book_id     uuid not null references books on delete cascade,
  body        text not null,
  page        int,
  noted_on    date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists idx_book_notes_book on book_notes(book_id, noted_on desc);
create index if not exists idx_book_notes_user on book_notes(user_id);

alter table book_notes enable row level security;
drop policy if exists book_notes_owner on book_notes;
create policy book_notes_owner on book_notes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Streak kindness: this many days a week can be skipped without breaking
-- your reading streak (0 = strict).
alter table profiles add column if not exists rest_days_per_week int not null default 0;
alter table profiles drop constraint if exists profiles_rest_days_check;
alter table profiles add constraint profiles_rest_days_check
  check (rest_days_per_week between 0 and 3);
