-- =====================================================================
-- Stacks — lending ledger + per-read-through history
-- Run this in the Supabase SQL editor after 0005_views_and_abandoned.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- loans — the lending ledger. Who has a book (or who you borrowed it
-- from), since when, and when it came back. An *active* loan is one with
-- returned_on IS NULL. direction: 'lent_out' = you lent it to someone;
-- 'borrowed' = you borrowed it from someone.
-- ---------------------------------------------------------------------
create table if not exists loans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  book_id     uuid not null references books on delete cascade,
  person      text not null,
  direction   text not null default 'lent_out'
              check (direction in ('lent_out', 'borrowed')),
  lent_on     date not null default current_date,
  due_on      date,
  returned_on date,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_loans_user on loans(user_id, returned_on);
create index if not exists idx_loans_book on loans(book_id);

alter table loans enable row level security;
drop policy if exists loans_owner on loans;
create policy loans_owner on loans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- read_throughs — one row per completed read of a book, each with its
-- own finish date, rating, and review. This is what lets a re-read keep
-- its own opinion instead of overwriting the last one. The book's own
-- rating/review/finished_on stay as the "latest / canonical" summary.
-- ---------------------------------------------------------------------
create table if not exists read_throughs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  book_id     uuid not null references books on delete cascade,
  started_on  date,
  finished_on date,
  rating      numeric check (rating >= 0 and rating <= 5),
  review      text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_read_throughs_book on read_throughs(book_id, finished_on desc);
create index if not exists idx_read_throughs_user on read_throughs(user_id);

alter table read_throughs enable row level security;
drop policy if exists read_throughs_owner on read_throughs;
create policy read_throughs_owner on read_throughs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Backfill: give every already-finished book a first read-through from
-- its existing rating/review/finish date, so the history isn't empty for
-- books read before this feature existed. Runs once; the NOT EXISTS guard
-- keeps it idempotent if the migration is re-applied.
-- ---------------------------------------------------------------------
insert into read_throughs (user_id, book_id, started_on, finished_on, rating, review)
select b.user_id, b.id, b.started_on, b.finished_on, b.rating, b.review
from books b
where b.read_status = 'read'
  and not exists (select 1 from read_throughs r where r.book_id = b.id);
