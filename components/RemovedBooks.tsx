"use client";

import Link from "next/link";
import { toast } from "sonner";
import { RotateCcw, Trash2 } from "lucide-react";
import { BookCover } from "./BookCover";
import { useArchivedBooks, useDeleteBook, useRestoreBook } from "@/lib/queries";
import { format, parseISO } from "date-fns";

// Settings → Removed books: put a removed book back, or delete it for good.
export function RemovedBooks() {
  const { data: books = [] } = useArchivedBooks();
  const restore = useRestoreBook();
  const del = useDeleteBook();

  if (!books.length)
    return (
      <p className="text-sm text-text-muted">
        Nothing removed. Books you remove keep their reading history and show up
        here, so you can put them back.
      </p>
    );

  return (
    <ul className="space-y-2">
      {books.map((b) => (
        <li key={b.id} className="card-soft flex items-center gap-3 p-2.5">
          <Link href={`/book/${b.id}`} className="w-8 shrink-0">
            <BookCover title={b.title} authors={b.authors} coverUrl={b.cover_url} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/book/${b.id}`} className="block truncate text-sm font-bold hover:underline">
              {b.title}
            </Link>
            <p className="text-xs text-text-muted">
              Removed {b.archived_at ? format(parseISO(b.archived_at), "d MMM yyyy") : ""}
            </p>
          </div>
          <button
            className="btn-outline h-10 min-h-0 px-3"
            onClick={() =>
              restore.mutate(b.id, { onSuccess: () => toast.success(`“${b.title}” is back`) })
            }
          >
            <RotateCcw className="h-4 w-4" /> Put back
          </button>
          <button
            aria-label="Delete forever"
            className="rounded-lg p-2.5 text-text-muted hover:bg-surface-2 hover:text-riso-pink"
            onClick={() => {
              if (
                confirm(
                  `Delete “${b.title}” forever?\n\nIts reading sessions, reads, quotes and loans are deleted too. This can't be undone.`,
                )
              )
                del.mutate(b.id, { onSuccess: () => toast.success("Deleted forever") });
            }}
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
