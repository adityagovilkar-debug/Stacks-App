"use client";

import Link from "next/link";
import { Quote as QuoteIcon, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { useQuotes, useDeleteQuote } from "@/lib/queries";

// The commonplace book — every saved quote across the library.
export default function QuotesPage() {
  const { data: quotes = [], isLoading } = useQuotes();
  const del = useDeleteQuote();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-extrabold misreg">Commonplace book</h1>
        <p className="mt-1 text-text-muted">
          Every line you&apos;ve thought worth keeping.
        </p>
      </header>

      {isLoading ? (
        <SkeletonList rows={5} />
      ) : quotes.length === 0 ? (
        <EmptyState
          icon={QuoteIcon}
          title="No quotes yet"
          hint="Open a book and use “Quotes & highlights” to save a favourite passage."
          action={
            <Link href="/library" className="btn-primary">
              Browse library
            </Link>
          }
        />
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 [&>*]:mb-4">
          {quotes.map((q) => (
            <div
              key={q.id}
              className="card break-inside-avoid border-l-4 border-riso-purple p-4"
            >
              <p className="font-display text-base italic leading-snug">“{q.text}”</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <Link
                  href={`/book/${q.book_id}`}
                  className="min-w-0 text-xs font-semibold text-text-muted hover:text-text"
                >
                  <span className="truncate">— {q.book?.title ?? "Book"}</span>
                  {q.page ? `, p. ${q.page}` : ""}
                </Link>
                <button
                  onClick={() => del.mutate(q.id)}
                  aria-label="Delete quote"
                  className="shrink-0 rounded-lg p-1.5 text-text-muted hover:bg-surface-2 hover:text-riso-pink"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
