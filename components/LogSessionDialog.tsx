"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "./Dialog";
import { useBooks, useLogSession, useUpdateSession } from "@/lib/queries";
import { todayISO } from "@/lib/stats";
import type { EditableSession, LogSessionDetail } from "@/lib/events";

export function LogSessionDialog({
  open,
  initialBook,
  initialMinutes,
  editSession,
  onClose,
}: {
  open: boolean;
  initialBook?: LogSessionDetail["book"];
  initialMinutes?: number;
  editSession?: EditableSession;
  onClose: () => void;
}) {
  const { data: books = [] } = useBooks();
  const log = useLogSession();
  const update = useUpdateSession();
  const isEditing = !!editSession;

  const [bookId, setBookId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [pages, setPages] = useState("");
  const [minutes, setMinutes] = useState("");
  const [endPage, setEndPage] = useState("");
  const [endPos, setEndPos] = useState("");
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
  const isAudio = selected?.format === "audiobook";

  useEffect(() => {
    if (!open) return;
    if (editSession) {
      setBookId(editSession.book_id);
      setDate(editSession.happened_on);
      setPages(editSession.pages_read ? String(editSession.pages_read) : "");
      setMinutes(editSession.minutes != null ? String(editSession.minutes) : "");
      setEndPage(editSession.end_page != null ? String(editSession.end_page) : "");
      setEndPos("");
      setNote(editSession.note ?? "");
      setShowAll(false);
      return;
    }
    setBookId(initialBook?.id ?? "");
    setDate(todayISO());
    setPages("");
    setMinutes(initialMinutes ? String(initialMinutes) : "");
    setEndPage("");
    setEndPos("");
    setNote("");
    setShowAll(false);
  }, [open, initialBook?.id, initialMinutes, editSession]);

  // When you say "I'm now on page X", auto-fill pages read from the bookmark.
  function onEndPage(v: string) {
    setEndPage(v);
    const end = Number(v);
    const from = selected?.current_page ?? 0;
    if (v && end > from && !pages) setPages(String(end - from));
  }
  // Audiobook: "now at minute X" auto-fills minutes listened.
  function onEndPos(v: string) {
    setEndPos(v);
    const end = Number(v);
    const from = selected?.audio_position_minutes ?? 0;
    if (v && end > from && !minutes) setMinutes(String(end - from));
  }

  async function save() {
    if (!bookId) return toast.error("Pick a book");
    if (isAudio) {
      if ((Number(minutes) || 0) <= 0 && !endPos)
        return toast.error("How many minutes did you listen?");
    } else if ((Number(pages) || 0) <= 0 && !endPage) {
      return toast.error("How many pages did you read?");
    }
    try {
      if (isEditing) {
        await update.mutateAsync({
          id: editSession!.id,
          book_id: bookId,
          patch: {
            happened_on: date,
            pages_read: isAudio ? 0 : Number(pages) || 0,
            minutes: minutes ? Number(minutes) : null,
            end_page: !isAudio && endPage ? Number(endPage) : null,
            note: note.trim() || null,
          },
        });
        toast.success("Session updated");
        onClose();
        return;
      }
      await log.mutateAsync({
        book_id: bookId,
        happened_on: date,
        pages_read: isAudio ? 0 : Number(pages) || 0,
        minutes: minutes ? Number(minutes) : null,
        end_page: !isAudio && endPage ? Number(endPage) : null,
        end_position_minutes: isAudio && endPos ? Number(endPos) : null,
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
      title={isEditing ? "Edit reading session" : "Log a reading session"}
      footer={
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary flex-1"
            onClick={save}
            disabled={log.isPending || update.isPending}
          >
            {log.isPending || update.isPending
              ? "Saving…"
              : isEditing
                ? "Save changes"
                : "Log it"}
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
            disabled={isEditing}
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
          {!isEditing && hiddenCount > 0 && (
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
          {isAudio ? (
            <>
              <div>
                <label className="label">Minutes listened</label>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="e.g. 45"
                />
              </div>
              {!isEditing && (
                <div>
                  <label className="label">Now at min (optional)</label>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    value={endPos}
                    onChange={(e) => onEndPos(e.target.value)}
                    placeholder={
                      selected?.audio_position_minutes
                        ? `was ${selected.audio_position_minutes}`
                        : "moves your bookmark"
                    }
                  />
                </div>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
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

        {!isAudio && speed != null && (
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
