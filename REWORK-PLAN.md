# Stacks — rework plan

Written 2026-11-13 from a read of the whole codebase at commit `6429548`.
Nothing here is built yet. Phases are ordered so each one is safe to ship on its own.

The risograph look stays. No Instrument/Bench styling anywhere in this app.

---

## Phase 0 — Bugs and data safety (do first)

These are things that are wrong today, found by reading the code. None were reproduced on your live data, because the preview cannot sign in.

### Data that can go silently wrong

| # | Problem | Where | Fix |
|---|---------|-------|-----|
| 0.1 | **The library stops at 1,000 books.** Supabase returns at most 1,000 rows per request and the app never asks for the next page. Past that, books (and reading sessions, quotes) quietly go missing from every page and every stat. | `useBooks`, `useSessions`, `useQuotes`, `useLoans` in `lib/queries.ts` | Fetch in pages of 1,000 until empty. |
| 0.2 | **Marking an old book "Read" counts it as read today.** There is no way to set started/finished dates in the form, so back-cataloguing books you read years ago inflates "read in 2026", Wrapped and the books-finished chart. | `BookForm.tsx`, `useSetReadStatus` | Add Started / Finished date fields, plus a "read before I used Stacks (date unknown)" choice that sets no finish date. |
| 0.3 | **Adding a book already marked Read skips the bookkeeping.** It gets no finish date, `times_read` stays 0 and no read-through is recorded. | `useAddBook` | Run the same side-effects as `useSetReadStatus`. |
| 0.4 | **Deleting or editing a session can overwrite a bookmark you set by hand.** The bookmark is rebuilt only from sessions. For audiobooks it uses total minutes listened, which ignores any "now at minute" jump. | `recomputeBookmark` | Only roll back when the deleted session is the one that set the current position; otherwise leave it. Store the audiobook end position on the session (new column) so it can be rebuilt properly. |
| 0.5 | **"Read again" marks the book finished today, immediately**, and adds a blank read-through. A re-read should start a new read, not complete one. | `useReadAgain` | Re-read sets status to Reading and clears the bookmark; the read-through is written when you finish. |
| 0.6 | **Two ratings that disagree.** The book has a rating/review and each read-through has its own. Changing one does not touch the other. | book page, `ReadThroughsSection` | The book's rating and review become the latest read-through's. One place to edit. |
| 0.7 | **Deleting the only read-through sets "times read" to 0 on a book still marked Read.** | `syncTimesRead` | Never drop below 1 while status is Read. |
| 0.8 | **Lending leaves ownership wrong.** Deleting an active loan does not restore "Owned". Returning a borrowed book leaves it "Borrowed". Setting "Lent out" in the edit form creates no loan. | `useDeleteLoan`, `useReturnLoan`, `BookForm` | Make the loan the single source: ownership is derived from the open loan. |
| 0.9 | **Deleting a book deletes its reading history**, which can break a streak and shrink past stats. One `confirm()` and no undo. | `useDeleteBook` | Add "Remove from library" (archive: hidden but history kept) as the default; real delete behind a second step. |
| 0.10 | **Missing covers show as blank white.** Open Library returns a 1×1 blank image instead of an error, so the riso placeholder never appears. | `lib/lookup.ts` | Add `?default=false` to Open Library cover URLs. |
| 0.11 | **Same book under ISBN-10 and ISBN-13 is not seen as a duplicate.** | `lib/duplicates.ts` | Normalise both to ISBN-13 before comparing. |

### Things that misbehave on screen

| # | Problem | Fix |
|---|---------|-----|
| 0.12 | Editing a session for a finished book shows an empty book picker (the picker only lists reading/queued books). | Include the edited session's book in the list. |
| 0.13 | Starting a second timer can ask "discard?" twice, because the question is asked inside a state update. | Move the check outside the updater. |
| 0.14 | On a phone the share bar, the timer pill and the Log button overlap at the bottom. | One stacked bottom area; hide the Log button while selecting. |
| 0.15 | A finished book still shows "Where you left off: 46%". | Hide the bookmark block when Read, or show 100%. |
| 0.16 | Every keystroke in the library search triggers a page navigation (the URL sync). | Debounce the URL write by ~300 ms. |
| 0.17 | Daily page goal and Wrapped "pages read" ignore Kindle-location books. | Count them through the book's own pages-per-location ratio when "≈ pages" is filled in. |
| 0.18 | Wrapped only looks at the book's single finish date, so a re-read in another year is invisible. | Build Wrapped from read-throughs. |
| 0.19 | "Offline" is weaker than it claims: writes made offline are dropped on reload, and every write first asks the server who you are. | Persist paused writes; read the user id from the cached session. Or say plainly in the UI that offline is read-only. |

### No backup exists

| # | Problem | Fix |
|---|---------|-----|
| 0.20 | There is no way to export your library. Every other app you use has one. | Settings → **Export everything** (one JSON file) and **Export books as CSV**. Restore from the JSON. |

---

## Phase 1 — Make cataloguing a big collection fast

The app is good at one book at a time. A large collection needs bulk tools.

1. **Bulk edit.** The Select mode already exists for sharing. Add actions to it: set location, add/remove tag, add to collection, set status, set ownership, queue.
2. **Shelf-by-shelf scanning.** Pick a location first, then batch-scan; every scan lands on that shelf. Today batch mode adds books with no location.
3. **"Do I own this?" check.** A scan mode that only answers yes/no (and where it is, and whether you've read it). For use in a bookshop. No acquisition counts or totals anywhere.
4. **Fix-up queue.** A page listing books missing something: no cover, no page count, no location, no genre. Work through them one tap at a time.
5. **Cover from camera.** Take or pick a photo when no database has the cover (common for your Indian editions). Stored in Supabase Storage.
6. **Re-fetch details.** A button on a book to look it up again and fill only the empty fields.
7. **Search that reaches further.** Library search should also match ISBN, publisher, tags, your review and quotes.

---

## Phase 2 — Perfect the reading loop

1. **One-tap "I read today".** On the dashboard card: enter the page you're on, done. The full dialog stays for everything else.
2. **Timer that can pause**, and that offers the page field as soon as you stop.
3. **Finish flow.** Marking a book Read opens a small sheet: finish date, rating, a line of review, "add to favourites", "what next?". Right now those are five separate places.
4. **Per-book pace.** Time-left uses your overall speed. A dense book and a thriller are not the same; use that book's own sessions once it has three or more.
5. **Kindle highlights import.** Read the Kindle `My Clippings.txt` file and add highlights to the commonplace book, matched to your books.
6. **Quote from a photo.** Photograph a page, pick the lines, save as a quote (text recognition runs on the phone).
7. **Notes while reading.** Dated notes per book, separate from the final review, shown in the reading history.
8. **Goals you can see.** The minutes goal is only used on the dashboard. Show both goals on the Progress page with a "days hit this month" count.
9. **Streak kindness.** Optional rest days (for example one per week) that do not break a streak.

---

## Phase 3 — Library depth

1. **Author pages.** Tap an author: their books you own, read, rated; gaps in series.
2. **Series: add the missing volume to a wishlist** straight from the dashed placeholder.
3. **Wishlist as its own page**, with "found it" turning the entry into an owned book (keeps tags and notes).
4. **Recommendations ledger.** "Recommended by" on a book, and a log of what you shared with whom (the share feature already knows the books; it just doesn't remember).
5. **Editions.** Link copies of the same work so duplicates show as "2 editions" instead of a warning.
6. **Smart shelves with "not".** Shelves can only include today. Add exclusions (not this tag, not read) and date rules (added this year, finished before 2020).
7. **Shelf map, real.** Locations as a tree you can open, with counts, and "move everything here to…". Today it is a flat list of covers.

---

## Phase 4 — UI, still risograph

Suggestions only. For anything that changes how a page looks I'd make a mockup first and build after you pick.

1. **Phone navigation.** 13 pages, 5 reachable from the bottom bar; the rest need the search palette. Add a "More" sheet as the fifth tab (Stats moves inside it or stays, your call).
2. **Book page is one long scroll** (10 cards). Split into tabs: Reading · Notes & quotes · Details · History. Keep the hero and the status buttons always visible.
3. **Library views.** Add a compact list view and a **spine view** (books drawn as coloured spines on a shelf, title up the side). The spine view suits the riso look and shows 4× more books per screen.
4. **Group by** in the library: author, series, location, year read.
5. **Active filters as chips** above the grid, each with an ×, so the filter panel can stay closed.
6. **Own dialogs.** Replace the browser's `confirm()` / `prompt()` boxes (delete book, name a shelf, timer swap) with riso sheets, and use an Undo toast for deletes.
7. **Print details.** Second-ink overprint on section headings, registration marks in page corners, a paper-edge texture on cards in dark mode (dark currently loses most of the print feel), stamp "thunk" animation when a status changes.
8. **Share card and Wrapped** use the system font. Draw them with the app's display font and the same halftone as the UI.
9. **Dashboard order.** Lead with the book you're reading and the one-tap log; move the three stat tiles below it.
10. **Text size and touch targets.** Several icon buttons (edit/delete on sessions, quotes) are under 32 px. Raise to 44 px on phones.

---

## Phase 5 — Under the hood

1. **Tests.** There are none. Start with the pure files (`stats.ts`, `series.ts`, `duplicates.ts`, `lookup.ts` ISBN maths, `viewQuery.ts`).
2. **Atomic writes.** Logging a session is two requests (insert, then update the book). Move it and the loan/read-through pairs into database functions so they cannot half-finish.
3. **Split `lib/queries.ts`** (≈1,100 lines) by area.
4. **One "progress unit" helper.** Pages / minutes / locations are branched by hand in nine files. One helper that returns label, total, position and noun.
5. **README of migrations.** Seven files to run by hand; add a checklist and a version check in Settings that says which ones are missing.

---

## Decisions (answered 2026-11-13)

| # | Question | Answer |
|---|----------|--------|
| A | Book's main rating follows the latest read | **Yes** |
| B | Deleting a book archives it by default, history kept | **Yes** |
| C | Offline | **Read-only for now** |
| D | Cover photos stored in Supabase Storage | **Yes** (with the cover-photo item, whenever that's built) |
| E | Mockups before navigation / book-page tabs / spine view | **Yes** |
| F | Bulk cataloguing (Phase 1) | **Not needed yet** — go to Phase 2 after Phase 0 |

## Progress

- **Phase 0 — done 2026-11-13.** Needs migration `0008_archive_and_positions.sql`.
  How the fixes landed:
  - Read-throughs are now the record of every read; the book's rating, review,
    finish date and "times read" are a summary of them (latest read wins, falling
    back to the most recent rated/reviewed read so an unrated re-read doesn't blank it).
  - "Read again" starts a re-read (status Reading, fresh bookmark); the new read is
    recorded when you mark it Read.
  - Edit form has Started / Finished dates; an empty finish date on a Read book
    means "don't remember when" and doesn't count toward any year.
  - Ownership: the edit form can set Owned / Wishlist / Not on my shelf; Lent out and
    Borrowed come only from the Lending section. A returned borrowed book becomes
    "Not on my shelf" (new value, in 0008).
  - Bookmark only moves back when the deleted/edited session was the latest one and
    the bookmark is still where it left it.
  - Kindle-location sessions count toward page goals and Wrapped pages using the
    book's own ≈ pages ratio, or ~15 locations/page if that isn't filled in. Reading
    *speed* stays print-only.
  - Remove = archive with Undo; Settings → Removed books to put back or delete forever.
  - Settings → Backup: export everything (JSON), library as CSV, restore (merge).
- Phase 1 — skipped for now (decision F).
- **Next: Phase 2.**
- Phase 5 note: `eslint` reports 13 "setState inside an effect" style errors (mostly
  older code). The build ignores them; tidy them in Phase 5.
