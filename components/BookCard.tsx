"use client";

import Link from "next/link";
import { Heart, ListChecks } from "lucide-react";
import { BookCover } from "./BookCover";
import { StatusStamp } from "./StatusStamp";
import { RatingStars } from "./RatingStars";
import { ProgressBar } from "./ProgressBar";
import { readingProgress } from "@/lib/stats";
import type { Book } from "@/lib/types";

export function BookCard({ book }: { book: Book }) {
  const progress = book.read_status === "reading" ? readingProgress(book) : null;

  return (
    <Link href={`/book/${book.id}`} className="group block">
      <div className="relative transition-transform duration-150 group-hover:-translate-y-1">
        <BookCover
          title={book.title}
          authors={book.authors}
          coverUrl={book.cover_url}
          className="pop-sm transition-shadow group-hover:[box-shadow:var(--shadow-riso)]"
        />
        {book.favorite && (
          <span className="absolute -right-2 -top-2 flex h-7 w-7 rotate-12 items-center justify-center rounded-full border-2 border-outline bg-riso-pink text-white pop-sm">
            <Heart className="h-3.5 w-3.5 fill-white" />
          </span>
        )}
        {book.queue_position != null && (
          <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full border-2 border-outline bg-riso-yellow px-1.5 py-0.5 text-[0.62rem] font-extrabold text-[#1a1430]">
            <ListChecks className="h-3 w-3" /> Queued
          </span>
        )}
      </div>

      <div className="mt-2 space-y-1">
        <h3 className="font-display text-sm font-bold leading-tight line-clamp-2">
          {book.title}
        </h3>
        {book.authors?.length ? (
          <p className="text-xs text-text-muted line-clamp-1">
            {book.authors.join(", ")}
          </p>
        ) : null}

        {progress != null ? (
          <div className="pt-1">
            <ProgressBar percent={progress} height={8} color="var(--color-riso-orange)" />
            <p className="mt-1 text-[0.65rem] font-semibold text-text-muted">
              {book.current_page}/{book.page_count} pp · {progress}%
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-0.5">
            <StatusStamp status={book.read_status} timesRead={book.times_read} />
            {book.rating != null && book.rating > 0 && (
              <RatingStars value={book.rating} size={12} />
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
