"use client";

import { useMemo } from "react";
import Link from "next/link";
import { HandHelping, Check, ArrowRight } from "lucide-react";
import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { useLoans, useReturnLoan } from "@/lib/queries";
import { LOAN_DIRECTION_LABEL, type Loan } from "@/lib/types";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";

export default function LendingPage() {
  const { data: loans = [], isLoading } = useLoans();
  const ret = useReturnLoan();

  const active = useMemo(() => loans.filter((l) => !l.returned_on), [loans]);
  const past = useMemo(() => loans.filter((l) => l.returned_on), [loans]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold misreg">Lending desk</h1>
        <p className="mt-1 text-text-muted">
          Who has your books — and which ones you need to give back.
        </p>
      </header>

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : loans.length === 0 ? (
        <EmptyState
          icon={HandHelping}
          title="No loans yet"
          hint="Open a book and use “Lend or log a borrow” to start tracking who has it."
          action={
            <Link href="/library" className="btn-primary">
              Browse library
            </Link>
          }
        />
      ) : (
        <>
          <section>
            <h2 className="mb-3 font-display text-xl font-extrabold">
              Out now
              <span className="ml-2 chip bg-surface-2">{active.length}</span>
            </h2>
            {active.length === 0 ? (
              <p className="card-soft p-4 text-sm text-text-muted">
                Everything&apos;s home. 🎉
              </p>
            ) : (
              <ul className="space-y-3">
                {active.map((l) => (
                  <LoanRow key={l.id} loan={l} onReturn={() => ret.mutate(l)} />
                ))}
              </ul>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-xl font-extrabold">Returned</h2>
              <ul className="space-y-2">
                {past.map((l) => (
                  <li
                    key={l.id}
                    className="card-soft flex items-center gap-3 p-2.5 text-sm"
                  >
                    <Link href={`/book/${l.book_id}`} className="w-8 shrink-0">
                      <BookCover title={l.book?.title ?? "Book"} coverUrl={l.book?.cover_url} />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/book/${l.book_id}`} className="truncate font-bold hover:underline">
                        {l.book?.title ?? "Book"}
                      </Link>
                      <p className="text-xs text-text-muted">
                        {l.direction === "lent_out" ? "Lent to" : "From"}{" "}
                        <b className="text-text">{l.person}</b> ·{" "}
                        {format(parseISO(l.lent_on), "MMM ''yy")}–
                        {l.returned_on ? format(parseISO(l.returned_on), "MMM ''yy") : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function LoanRow({ loan, onReturn }: { loan: Loan; onReturn: () => void }) {
  const days = differenceInCalendarDays(new Date(), parseISO(loan.lent_on));
  const overdue =
    loan.due_on && differenceInCalendarDays(new Date(), parseISO(loan.due_on)) > 0;
  return (
    <li
      className={cn(
        "card flex items-center gap-3 p-3",
        overdue && "bg-riso-pink/10",
      )}
    >
      <Link href={`/book/${loan.book_id}`} className="w-10 shrink-0">
        <BookCover title={loan.book?.title ?? "Book"} coverUrl={loan.book?.cover_url} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/book/${loan.book_id}`} className="truncate font-display text-sm font-bold hover:underline">
          {loan.book?.title ?? "Book"}
        </Link>
        <p className="text-xs text-text-muted">
          <span className="font-bold text-text">
            {loan.direction === "lent_out" ? `→ ${loan.person}` : `← ${loan.person}`}
          </span>{" "}
          · {LOAN_DIRECTION_LABEL[loan.direction]} {days > 0 ? `${days}d ago` : "today"}
          {loan.due_on
            ? ` · due ${format(parseISO(loan.due_on), "d MMM")}${overdue ? " ⚠️" : ""}`
            : ""}
        </p>
      </div>
      <button onClick={onReturn} className="btn-outline shrink-0">
        <Check className="h-4 w-4" />
        {loan.direction === "lent_out" ? "Back" : "Returned"}
      </button>
    </li>
  );
}
