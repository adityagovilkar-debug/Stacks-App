"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Dialog } from "./Dialog";
import { useAddBookNotes, useAddQuotes, useBooks, useQuotes, fetchAll } from "@/lib/queries";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { matchBook, normQuote, parseClippings, type ClippingGroup } from "@/lib/kindle";
import { todayISO } from "@/lib/stats";

interface Row {
  group: ClippingGroup;
  bookId: string; // "" = skip
}

// Import highlights + notes from a Kindle's "My Clippings.txt". Highlights go
// to the commonplace book, notes to the book's reading history. Anything
// already imported is skipped, so re-importing the same file is safe.
export function KindleImport() {
  const { data: books = [] } = useBooks();
  const { data: quotes = [] } = useQuotes();
  const addQuotes = useAddQuotes();
  const addNotes = useAddBookNotes();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  const sortedBooks = useMemo(
    () => [...books].sort((a, b) => a.title.localeCompare(b.title)),
    [books],
  );
  const haveQuote = useMemo(
    () => new Set(quotes.map((q) => `${q.book_id}|${normQuote(q.text)}`)),
    [quotes],
  );

  async function onFile(file: File) {
    const groups = parseClippings(await file.text());
    if (!groups.length) {
      toast.error("No highlights found. Is this the “My Clippings.txt” file?");
      return;
    }
    setRows(groups.map((g) => ({ group: g, bookId: matchBook(g, books)?.id ?? "" })));
  }

  const counts = (r: Row) => {
    const hs = r.group.clippings.filter((c) => c.kind === "highlight");
    const fresh = r.bookId ? hs.filter((h) => !haveQuote.has(`${r.bookId}|${normQuote(h.text)}`)) : hs;
    return {
      highlights: hs.length,
      newHighlights: fresh.length,
      notes: r.group.clippings.length - hs.length,
    };
  };

  async function runImport() {
    if (!rows) return;
    setBusy(true);
    try {
      // Existing notes, so a re-import doesn't duplicate them.
      const existingNotes = await fetchAll<{ book_id: string; body: string }>(() =>
        supabaseBrowser().from("book_notes").select("book_id, body").order("id"),
      ).catch(() => [] as { book_id: string; body: string }[]);
      const haveNote = new Set(existingNotes.map((n) => `${n.book_id}|${normQuote(n.body)}`));

      const quoteRows = [];
      const noteRows = [];
      for (const r of rows) {
        if (!r.bookId) continue;
        for (const c of r.group.clippings) {
          if (c.kind === "highlight") {
            if (haveQuote.has(`${r.bookId}|${normQuote(c.text)}`)) continue;
            quoteRows.push({
              book_id: r.bookId,
              text: c.text,
              page: c.page,
              note: c.location != null && c.page == null ? `Kindle loc. ${c.location}` : null,
              ...(c.addedAt ? { created_at: c.addedAt } : {}),
            });
          } else {
            const body = c.page == null && c.location != null ? `${c.text} (loc. ${c.location})` : c.text;
            if (haveNote.has(`${r.bookId}|${normQuote(body)}`)) continue;
            noteRows.push({
              book_id: r.bookId,
              body,
              page: c.page,
              noted_on: c.addedAt ? c.addedAt.slice(0, 10) : todayISO(),
              ...(c.addedAt ? { created_at: c.addedAt } : {}),
            });
          }
        }
      }
      await addQuotes.mutateAsync(quoteRows);
      if (noteRows.length) await addNotes.mutateAsync(noteRows);
      toast.success(
        `Imported ${quoteRows.length} highlight${quoteRows.length === 1 ? "" : "s"}` +
          (noteRows.length ? ` and ${noteRows.length} note${noteRows.length === 1 ? "" : "s"}` : ""),
      );
      setRows(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const total = rows?.reduce((n, r) => n + (r.bookId ? counts(r).newHighlights : 0), 0) ?? 0;

  return (
    <>
      <button className="btn-outline" onClick={() => fileRef.current?.click()}>
        <Upload className="h-5 w-5" /> Import Kindle highlights
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".txt,text/plain"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />

      <Dialog
        open={!!rows}
        onClose={() => setRows(null)}
        title="Import Kindle highlights"
        wide
        footer={
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => setRows(null)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={runImport} disabled={busy || !total}>
              {busy ? "Importing…" : `Import ${total} highlight${total === 1 ? "" : "s"}`}
            </button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-text-muted">
          Check each book is matched to the right one in your library. Unmatched
          books are skipped. Highlights you&apos;ve already imported are left out.
        </p>
        <ul className="space-y-2">
          {rows?.map((r, i) => {
            const c = counts(r);
            return (
              <li key={i} className="card-soft space-y-2 p-3">
                <div>
                  <p className="font-display text-sm font-bold leading-tight">{r.group.rawTitle}</p>
                  <p className="text-xs text-text-muted">
                    {r.group.author ? `${r.group.author} · ` : ""}
                    {c.highlights} highlight{c.highlights === 1 ? "" : "s"}
                    {r.bookId && c.newHighlights < c.highlights
                      ? ` (${c.highlights - c.newHighlights} already in)`
                      : ""}
                    {c.notes ? ` · ${c.notes} note${c.notes === 1 ? "" : "s"}` : ""}
                  </p>
                </div>
                <select
                  className="select"
                  value={r.bookId}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev!.map((x, j) => (j === i ? { ...x, bookId: e.target.value } : x)),
                    )
                  }
                >
                  <option value="">— Skip this book —</option>
                  {sortedBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                      {b.authors[0] ? ` — ${b.authors[0]}` : ""}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      </Dialog>
    </>
  );
}
