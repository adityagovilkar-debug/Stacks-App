-- =====================================================================
-- Stacks — add an "on_hold" (paused) read status
-- Run this in the Supabase SQL editor after 0002_quotes_audio.sql.
--
-- "on_hold" is a started-but-paused book: it keeps its progress + bookmark
-- (current_page / audio_position_minutes) but is treated as inactive — it
-- drops out of "Currently reading" until you resume it.
-- =====================================================================

alter table books drop constraint if exists books_read_status_check;
alter table books add constraint books_read_status_check
  check (read_status in ('unread', 'reading', 'on_hold', 'read'));
