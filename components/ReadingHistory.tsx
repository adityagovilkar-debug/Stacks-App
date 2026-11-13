"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Clock, Pencil, Trash2, StickyNote, Plus } from "lucide-react";
import {
  useAddBookNotes,
  useBookNotes,
  useDeleteBookNote,
  useDeleteSession,
} from "@/lib/queries";
import { openEditSession } from "@/lib/events";
import { isAudiobook, isLocationEbook, todayISO } from "@/lib/stats";
import { format, parseISO } from "date-fns";
import type { Book, BookNote, ReadingSession } from "@/lib/types";

type Entry =
  | { kind: "session"; date: string; at: string; s: ReadingSession }
  | { kind: "note"; date: string; at: string; n: BookNote };

// A book's reading journal: logged sessions and notes made while reading, in
// one timeline, newest first.
export function ReadingHistory({
  book,
  sessions,
  mode = "all",
}: {
  book: Book;
  sessions: ReadingSession[];
  // "notes" = notes while reading (with the note box); "sessions" = logged
  // sessions only; "all" = both in one timeline.
  mode?: "all" | "notes" | "sessions";
}) {
  const { data: notes = [] } = useBookNotes(book.id);
  const addNotes = useAddBookNotes();
  const delNote = useDeleteBookNote();
  const delSession = useDeleteSession();
  const audio = isAudiobook(book);
  const loc = isLocationEbook(book);

  const [noteText, setNoteText] = useState("");
  const [notePage, setNotePage] = useState("");

  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [
      ...(mode === "notes" ? [] : sessions).map((s) => ({ kind: "session" as const, date: s.happened_on, at: s.created_at, s })),
      ...(mode === "sessions" ? [] : notes).map((n) => ({ kind: "note" as const, date: n.noted_on, at: n.created_at, n })),
    ];
    return out.sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at));
  }, [sessions, notes, mode]);

  async function addNote() {
    const body = noteText.trim();
    if (!body) return;
    try {
      await addNotes.mutateAsync([
        {
          book_id: book.id,
          body,
          page: notePage ? Number(notePage) : null,
          noted_on: todayISO(),
        },
      ]);
      setNoteText("");
      setNotePage("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the note");
    }
  }

  const unitWord = audio ? "min" : loc ? "loc." : "p.";

  return (
    <section className="card p-5">
      <h2 className="mb-3 font-display text-lg font-extrabold">
        {mode === "notes" ? "Notes while reading" : "Reading history"}
      </h2>

      {/* Quick note while reading */}
      {mode !== "sessions" && (
      <div className="mb-4 flex flex-wrap gap-2 rounded-xl border-2 border-outline bg-surface-2 p-2.5">
        <input
          className="input min-w-0 flex-1"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNote()}
          placeholder="A thought while reading…"
        />
        <input
          className="input w-24"
          type="number"
          inputMode="numeric"
          value={notePage}
          onChange={(e) => setNotePage(e.target.value)}
          placeholder={unitWord}
          aria-label="Where in the book"
        />
        <button className="btn-outline" onClick={addNote} disabled={addNotes.isPending || !noteText.trim()}>
          <Plus className="h-4 w-4" /> Note
        </button>
      </div>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-text-muted">
          {mode === "notes"
            ? "No notes yet. Jot a thought as you read — it lands here with the date and page."
            : "No sessions yet. Hit “Log reading” to start tracking your progress."}
        </p>
      ) : (
        <ul className="divide-y-2 divide-border">
          {entries.map((e) =>
            e.kind === "note" ? (
              <li key={"n" + e.n.id} className="flex items-start gap-3 py-2.5">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-riso-purple" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-text-muted">
                    {format(parseISO(e.n.noted_on), "EEE, d MMM yyyy")}
                    {e.n.page != null ? ` · ${unitWord} ${e.n.page}` : ""}
                  </p>
                  <p className="whitespace-pre-line text-sm">{e.n.body}</p>
                </div>
                <button
                  onClick={() => delNote.mutate(e.n.id)}
                  aria-label="Delete note"
                  className="tap rounded-lg p-2 text-text-muted hover:bg-surface-2 hover:text-riso-pink"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ) : (
              <li key={"s" + e.s.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1">
                  <p className="text-sm font-bold">
                    {format(parseISO(e.s.happened_on), "EEE, d MMM yyyy")}
                    <span className="font-normal text-text-muted">
                      {" · logged "}
                      {format(parseISO(e.s.created_at), "h:mm a")}
                    </span>
                  </p>
                  <p className="text-xs text-text-muted">
                    {audio
                      ? `🎧 ${e.s.minutes ?? 0} min listened`
                      : loc
                        ? `📖 ${(e.s.locations_read ?? 0).toLocaleString()} locations${e.s.minutes ? ` · ${e.s.minutes} min` : ""}`
                        : `${e.s.pages_read} pages${e.s.minutes ? ` · ${e.s.minutes} min` : ""}${
                            e.s.minutes && e.s.pages_read
                              ? ` · ~${Math.round((e.s.pages_read / e.s.minutes) * 60)} pp/hr`
                              : ""
                          }`}
                    {e.s.note ? ` · “${e.s.note}”` : ""}
                  </p>
                </div>
                <button
                  onClick={() =>
                    openEditSession({
                      id: e.s.id,
                      book_id: e.s.book_id,
                      book_title: book.title,
                      happened_on: e.s.happened_on,
                      pages_read: e.s.pages_read,
                      minutes: e.s.minutes,
                      end_page: e.s.end_page,
                      locations_read: e.s.locations_read,
                      end_location: e.s.end_location,
                      note: e.s.note,
                    })
                  }
                  aria-label="Edit session"
                  className="tap rounded-lg p-2 text-text-muted hover:bg-surface-2 hover:text-riso-blue"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => delSession.mutate(e.s.id)}
                  aria-label="Delete session"
                  className="tap rounded-lg p-2 text-text-muted hover:bg-surface-2 hover:text-riso-pink"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ),
          )}
        </ul>
      )}
      {mode !== "notes" && (
      <p className="mt-3 flex items-center gap-1.5 text-xs text-text-muted">
        <Clock className="h-3.5 w-3.5" />
        {audio
          ? `${sessions.reduce((n, s) => n + (s.minutes || 0), 0)} minutes logged across `
          : loc
            ? `${sessions.reduce((n, s) => n + (s.locations_read || 0), 0).toLocaleString()} locations logged across `
            : `${sessions.reduce((n, s) => n + s.pages_read, 0)} pages logged across `}
        {sessions.length} sessions
        {notes.length ? ` · ${notes.length} note${notes.length === 1 ? "" : "s"}` : ""}
      </p>
      )}
    </section>
  );
}
