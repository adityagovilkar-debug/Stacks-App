-- =====================================================================
-- Stacks — track ebooks by Kindle "location" instead of pages.
-- Run this in the Supabase SQL editor after 0006_loans_and_rereads.sql.
--
-- Kindle "locations" are a fixed, layout-independent unit (~128 bytes of
-- text each), so they're a stable progress measure — unlike page numbers,
-- which Kindle re-estimates from your font/layout. An ebook with
-- total_locations set is measured by location (mirrors how audiobooks are
-- measured by minutes); page_count, if present, is just an optional
-- "≈ print pages" note.
-- =====================================================================

alter table books add column if not exists total_locations   int;  -- e.g. 13000
alter table books add column if not exists current_location  int;  -- the bookmark, in locations

alter table reading_sessions add column if not exists locations_read int;  -- how many locations this session
alter table reading_sessions add column if not exists end_location   int;  -- "now at location N" (advances the bookmark)
