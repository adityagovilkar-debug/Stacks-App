-- =====================================================================
-- Stacks — Phase 0 fixes. Run after 0007_ebook_locations.sql.
-- Safe to run more than once.
-- =====================================================================

-- "Remove from library" hides a book but keeps its reading history,
-- read-throughs, quotes and loans. Only "Delete forever" removes rows.
alter table books add column if not exists archived_at timestamptz;

-- Audiobook "now at minute N" is now stored on the session, so editing or
-- deleting a session can move the bookmark back correctly.
alter table reading_sessions add column if not exists end_position_minutes int;

-- A borrowed book you've given back isn't on your shelf any more.
alter table books drop constraint if exists books_ownership_check;
alter table books add constraint books_ownership_check
  check (ownership in ('owned', 'wishlist', 'borrowed', 'lent_out', 'not_owned'));
