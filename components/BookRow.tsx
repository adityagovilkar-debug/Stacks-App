"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { BookCover } from "./BookCover";
import { StatusStamp } from "./StatusStamp";
import { readingProgress } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { Book } from "@/lib/types";

// Compact library row: small cover, title, one line of detail, status stamp.
export function BookRow({
  book,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  book: Book;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const progress =
    book.read_status === "reading" || book.read_status === "on_hold" ? readingProgress(book) : null;
  const stars = book.rating && book.rating > 0 ? `${book.rating}★` : null;
  const detail = [
    book.authors.join(", ") || null,
    book.published_year,
    progress != null ? `${progress}%` : stars,
    book.ownership === "wishlist" ? "wanted" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const body = (
    <>
      {selectable && (
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-outline",
            selected ? "bg-riso-blue text-white" : "bg-surface text-transparent",
          )}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      )}
      <span className="w-8 shrink-0">
        <BookCover title={book.title} authors={book.authors} coverUrl={book.cover_url} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate font-display text-sm font-extrabold">{book.title}</span>
        <span className="block truncate text-xs font-semibold text-text-muted">{detail}</span>
      </span>
      <StatusStamp status={book.read_status} timesRead={book.times_read} className="shrink-0 rotate-0 text-[0.62rem]" />
    </>
  );

  const cls = "flex min-h-14 w-full items-center gap-3 border-b-[1.5px] border-dashed border-border py-2";
  if (selectable)
    return (
      <button type="button" onClick={onToggleSelect} className={cls} aria-pressed={selected}>
        {body}
      </button>
    );
  return (
    <Link href={`/book/${book.id}`} className={cls}>
      {body}
    </Link>
  );
}
