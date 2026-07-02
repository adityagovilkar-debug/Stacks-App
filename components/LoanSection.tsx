"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HandHelping, ArrowRightLeft, Check, Trash2, X } from "lucide-react";
import {
  useBookLoans,
  useAddLoan,
  useReturnLoan,
  useDeleteLoan,
} from "@/lib/queries";
import { todayISO } from "@/lib/stats";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { LOAN_DIRECTION_LABEL, type Book, type LoanDirection } from "@/lib/types";
import { cn } from "@/lib/utils";

// Track who has a book (lent out) or who you owe it to (borrowed), so it comes
// home. The active loan drives the book's ownership badge.
export function LoanSection({ book }: { book: Book }) {
  const { data: loans = [] } = useBookLoans(book.id);
  const addLoan = useAddLoan();
  const returnLoan = useReturnLoan();
  const delLoan = useDeleteLoan();

  const active = loans.find((l) => !l.returned_on) ?? null;
  const past = loans.filter((l) => l.returned_on);

  const [adding, setAdding] = useState(false);
  const [direction, setDirection] = useState<LoanDirection>("lent_out");
  const [person, setPerson] = useState("");
  const [lentOn, setLentOn] = useState(todayISO());
  const [dueOn, setDueOn] = useState("");
  const [note, setNote] = useState("");

  async function save() {
    if (!person.trim()) return toast.error("Who has it?");
    try {
      await addLoan.mutateAsync({
        book_id: book.id,
        person: person.trim(),
        direction,
        lent_on: lentOn,
        due_on: dueOn || null,
        note: note.trim() || null,
      });
      setAdding(false);
      setPerson("");
      setDueOn("");
      setNote("");
      toast.success(direction === "lent_out" ? "Marked as lent out" : "Marked as borrowed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    }
  }

  const daysOut = active ? differenceInCalendarDays(new Date(), parseISO(active.lent_on)) : 0;
  const overdue =
    active?.due_on && differenceInCalendarDays(new Date(), parseISO(active.due_on)) > 0;

  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold">
        <HandHelping className="h-5 w-5 text-riso-orange" /> Lending
      </h2>

      {active ? (
        <div
          className={cn(
            "rounded-xl border-2 border-outline p-3",
            overdue ? "bg-riso-pink/15" : "bg-surface-2",
          )}
        >
          <p className="text-sm font-bold">
            {active.direction === "lent_out"
              ? `Lent to ${active.person}`
              : `Borrowed from ${active.person}`}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            Since {format(parseISO(active.lent_on), "d MMM yyyy")}
            {daysOut > 0 ? ` · ${daysOut} day${daysOut === 1 ? "" : "s"} out` : ""}
            {active.due_on
              ? ` · due ${format(parseISO(active.due_on), "d MMM")}${overdue ? " (overdue!)" : ""}`
              : ""}
          </p>
          {active.note && (
            <p className="mt-1 text-xs italic text-text-muted">“{active.note}”</p>
          )}
          <div className="mt-3 flex gap-2">
            <button className="btn-outline" onClick={() => returnLoan.mutate(active)}>
              <Check className="h-4 w-4" />
              {active.direction === "lent_out" ? "It came back" : "Returned it"}
            </button>
            <button
              className="btn-ghost text-riso-pink"
              onClick={() => {
                if (confirm("Delete this loan record?")) delLoan.mutate(active);
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      ) : adding ? (
        <div className="space-y-3 rounded-xl border-2 border-outline bg-surface-2 p-3">
          <div className="inline-flex rounded-lg border-2 border-outline bg-surface p-0.5">
            {(["lent_out", "borrowed"] as LoanDirection[]).map((d) => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-bold transition",
                  direction === d ? "bg-riso-blue text-white" : "text-text-muted",
                )}
              >
                {LOAN_DIRECTION_LABEL[d]}
              </button>
            ))}
          </div>
          <div>
            <label className="label">
              {direction === "lent_out" ? "Lent to" : "Borrowed from"}
            </label>
            <input
              className="input"
              autoFocus
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              placeholder="Person's name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Since</label>
              <input
                className="input"
                type="date"
                value={lentOn}
                max={todayISO()}
                onChange={(e) => setLentOn(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Due back (optional)</label>
              <input
                className="input"
                type="date"
                value={dueOn}
                onChange={(e) => setDueOn(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. the signed hardback"
            />
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={save} disabled={addLoan.isPending}>
              {addLoan.isPending ? "Saving…" : "Save"}
            </button>
            <button className="btn-ghost" onClick={() => setAdding(false)}>
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-outline" onClick={() => setAdding(true)}>
          <ArrowRightLeft className="h-5 w-5" /> Lend or log a borrow
        </button>
      )}

      {past.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
            Loan history
          </p>
          <ul className="space-y-1.5">
            {past.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-text-muted">
                  {l.direction === "lent_out" ? "Lent to" : "From"} <b className="text-text">{l.person}</b>
                  {" · "}
                  {format(parseISO(l.lent_on), "MMM ''yy")}–
                  {l.returned_on ? format(parseISO(l.returned_on), "MMM ''yy") : ""}
                </span>
                <button
                  onClick={() => delLoan.mutate(l)}
                  aria-label="Delete loan record"
                  className="shrink-0 rounded-lg p-1 text-text-muted hover:text-riso-pink"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
