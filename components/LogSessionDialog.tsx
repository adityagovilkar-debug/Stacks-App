"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "./Dialog";
import { useBooks, useLogSession } from "@/lib/queries";
import { todayISO } from "@/lib/stats";
import type { LogSessionDetail } from "@/lib/events";

export function LogSessionDialog({
  open,
  initialBook,
  onClose,
}: {
  open: boolean;
  initialBook?: LogSessionDetail["book"];
  onClose: () => void;
}) {
  const { data: books = [] } = useBooks();
  const log = useLogSession();

  const [bookId, setBookId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [pages, setPages] = useState("");
  const [minutes, setMinutes] = useState("");
  const [endPage, setEndPage] = useState("");
  const [note, setNote] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Default the picker to what you're actually reading or plan to read next —
  // books that are "reading" or in your queue (plus the book the dialog was
  // opened for). "Show all" reveals the rest of the library on demand.
  const activeBooks = useMemo(
    () =>
      books.filter(
        (b) =>
          b.read_status === "reading" ||
          b.queue_position != null ||
          b.id === initialBook?.id,
      ),
    [books, initialBook?.id],
  );

  const options = useMemo(() => {
    const rank = (b: (typeof books)[number]) =>
      b.read_status === "reading" ? 0 : b.queue_position != null ? 1 : 2;
    return [...(showAll ? books : activeBooks)].sort((a, b) => {
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      if (a.queue_position != null && b.queue_position != null)
        return a.queue_position - b.queue_position;
      return a.title.localeCompare(b.title);
    });
  }, [books, activeBooks, showAll]);

  const hiddenCount = books.length - activeBooks.length;
  const selected = books.find((b) => b.id === bookId);

  useEffect(() => {
    if (!open) return;
    setBookId(initialBook?.id ?? "");
    setDate(todayISO());
    setPages("");
    setMinutes("");
    setEndPage("");
    setNote("");
    setShowAll(false);
  }, [open, initialBook?.id]);

  // When you say "I'm now on page X", auto-fill pages read from the bookmark.
  function onEndPage(v: string) {
    setEndPage(v);
    const end = Number(v);
    const from = selected?.current_page ?? 0;
    if (v && end > from && !pages) setPages(String(end - from));
  }

  async function save() {
    if (!bookId) return toast.error("Pick a book");
    const p = Number(pages) || 0;
    if (p <= 0 && !endPage) return toast.error("How many pages did you read?");
    try {
      await log.mutateAsync({
        book_id: bookId,
        happened_on: date,
        pages_read: p,
        minutes: minutes ? Number(minutes) : null,
        end_page: endPage ? Number(endPage) : null,
        note: note.trim() || null,
      });
      toast.success("Logged! Keep the streak going 🔥");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't log that");
    }
  }

  const speed =
    pages && minutes && Number(minutes) > 0
      ? Math.round((Number(pages) / Number(minutes)) * 60)
      : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Log a reading session"
      footer={
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={log.isPending}>
            {log.isPending ? "Saving…" : "Log it"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Book</label>
          <select
            className="select"
            value={bookId}
            onChange={(e) => setBookId(e.target.value)}
          >
            <option value="">
              {options.length ? "— Choose a book —" : "— Nothing reading or queued —"}
            </option>
            {options.map((b) => (
              <option key={b.id} value={b.id}>
                {b.read_status === "reading" ? "● " : ""}
                {b.title}
                {b.read_status !== "reading" && b.queue_position != null
                  ? " · queued"
                  : ""}
              </option>
            ))}
          </select>
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="mt-1.5 text-xs font-bold text-riso-blue hover:underline"
            >
              {showAll
                ? "Show only reading & queued"
                : `Show all books (+${hiddenCount})`}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Pages read</label>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={pages}
              onChange={(e) => setPages(e.target.value)}
              placeholder="e.g. 32"
            />
          </div>
          <div>
            <label className="label">Minutes (optional)</label>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="for speed"
            />
          </div>
          <div>
            <label className="label">Now on page (optional)</label>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={endPage}
              onChange={(e) => onEndPage(e.target.value)}
              placeholder={
                selected?.current_page
                  ? `was ${selected.current_page}`
                  : "moves your bookmark"
              }
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {speed != null && (
          <p className="text-sm font-semibold text-riso-blue">
            That&apos;s ~{speed} pages/hour ⚡
          </p>
        )}

        <div>
          <label className="label">Note (optional)</label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="A thought, a quote, where you stopped…"
          />
        </div>
      </div>
    </Dialog>
  );
}
