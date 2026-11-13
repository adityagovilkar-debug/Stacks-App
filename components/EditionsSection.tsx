"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Copy, Link2, Unlink } from "lucide-react";
import { BookCover } from "./BookCover";
import { useBooks, useSetEdition } from "@/lib/queries";
import { otherEditions } from "@/lib/duplicates";
import { FORMAT_LABEL, type Book } from "@/lib/types";

// Other editions of this book: the ones you've linked, and ones that look
// like the same work (same title + author) that you can link with a tap.
export function EditionsSection({ book }: { book: Book }) {
  const { data: books = [] } = useBooks();
  const setEdition = useSetEdition();

  const linked = book.work_id
    ? books.filter((b) => b.id !== book.id && b.work_id === book.work_id)
    : [];
  const linkedIds = new Set(linked.map((b) => b.id));
  const candidates = otherEditions(books, book).filter((b) => !linkedIds.has(b.id));

  if (!linked.length && !candidates.length) return null;

  const describe = (b: Book) =>
    [b.format ? FORMAT_LABEL[b.format] : null, b.publisher, b.published_year, b.isbn13]
      .filter(Boolean)
      .join(" · ") || "No edition details";

  function link(other: Book) {
    const workId = book.work_id ?? other.work_id ?? crypto.randomUUID();
    setEdition.mutate(
      { ids: [book.id, other.id], workId },
      { onSuccess: () => toast.success("Linked as editions") },
    );
  }

  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold">
        <Copy className="h-5 w-5 text-riso-blue" /> Editions
        {linked.length > 0 && <span className="chip bg-surface-2">{linked.length + 1}</span>}
      </h2>
      <ul className="space-y-2">
        {linked.map((b) => (
          <li key={b.id} className="flex items-center gap-3">
            <Link href={`/book/${b.id}`} className="w-8 shrink-0">
              <BookCover title={b.title} authors={b.authors} coverUrl={b.cover_url} />
            </Link>
            <div className="min-w-0 flex-1 text-sm">
              <Link href={`/book/${b.id}`} className="font-bold hover:underline">
                {b.title}
              </Link>
              <p className="truncate text-xs text-text-muted">{describe(b)}</p>
            </div>
            <button
              className="tap rounded-lg p-2 text-text-muted hover:bg-surface-2 hover:text-riso-pink"
              aria-label="Unlink this edition"
              onClick={() => setEdition.mutate({ ids: [b.id], workId: null })}
            >
              <Unlink className="h-4 w-4" />
            </button>
          </li>
        ))}
        {candidates.map((b) => (
          <li key={b.id} className="flex items-center gap-3 rounded-xl border-2 border-dashed border-outline/40 p-2">
            <Link href={`/book/${b.id}`} className="w-8 shrink-0">
              <BookCover title={b.title} authors={b.authors} coverUrl={b.cover_url} />
            </Link>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-bold">Another edition?</p>
              <p className="truncate text-xs text-text-muted">{describe(b)}</p>
            </div>
            <button className="chip" onClick={() => link(b)}>
              <Link2 className="h-3.5 w-3.5" /> Link
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
