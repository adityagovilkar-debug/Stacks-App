-- =====================================================================
-- Stacks — public_shelf
-- A read-only, ANONYMOUSLY-readable projection of the reading list, for
-- adityagovilkar.com to display. It exposes only a handful of safe columns
-- (no reviews, notes, locations, sessions, etc.) for books that are being
-- read, on hold, finished, or queued — never the full `books` table.
--
-- Safe because:
--   * It's a VIEW with security_invoker = false, so it runs as its owner
--     (postgres, the table owner) and is not blocked by the owner-only RLS
--     on `books`. Only this curated view is granted to the public `anon` role.
--   * `anon` is granted SELECT on the view ONLY — never on `books` itself.
--
-- This is a single-account instance, so no per-user filter is needed. If you
-- ever add other users, add `and user_id = '<your-uuid>'` to the WHERE clause.
--
-- Run this in the Supabase SQL editor after 0003_on_hold.sql.
-- =====================================================================

create or replace view public_shelf
with (security_invoker = false) as
select
  case
    when read_status = 'reading'    then 'reading'
    when read_status = 'on_hold'    then 'paused'
    when read_status = 'read'       then 'read'
    when queue_position is not null then 'want'
  end                                   as shelf,
  title,
  array_to_string(authors, ', ')        as author,
  rating,
  published_year,
  cover_url,
  finished_on,
  queue_position,
  updated_at
from books
where read_status in ('reading', 'on_hold', 'read')
   or queue_position is not null;

-- Read-only access for the public API role. (No grant on `books` itself.)
grant select on public_shelf to anon;
