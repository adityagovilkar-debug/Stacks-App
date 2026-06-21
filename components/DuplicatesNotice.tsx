"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, Trash2, X, ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { BookCover } from "./BookCover";
import { useDeleteBook } from "@/lib/queries";
import { duplicateGroups } from "@/lib/duplicates";
import type { Book } from "@/lib/types";

// A dismissible panel that surfaces likely-duplicate books so the user can
// remove accidental double-adds. Intentional extra copies (different editions)
// have different ISBNs and won't appear here.
export function DuplicatesNotice({ books }: { books: Book[] }) {
  const groups = useMemo(() => duplicateGroups(books), [books]);
  const del = useDeleteBook();
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);

  if (dismissed || groups.length === 0) return null;

  const extra = groups.reduce((n, g) => n + (g.length - 1), 0);

  function remove(b: Book) {
    if (!confirm(`Delete this copy of “${b.title}”? This can't be undone.`)) return;
    del.mutate(b.id, { onSuccess: () => toast.success("Copy removed") });
  }

  return (
    <div className="card-soft overflow-hidden border-riso-orange/60 bg-riso-orange/10">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <Copy className="h-5 w-5 shrink-0 text-riso-orange" />
        <span className="flex-1 font-display text-sm font-extrabold">
          {extra} possible duplicate {extra === 1 ? "copy" : "copies"} found
          <span className="ml-1 font-sans font-normal text-text-muted">
            — across {groups.length} {groups.length === 1 ? "book" : "books"}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
          }}
          onKeyDown={(e) => e.key === "Enter" && setDismissed(true)}
          aria-label="Dismiss"
          className="rounded p-1 text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <X className="h-4 w-4" />
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t-2 border-outline/20 px-4 py-3">
          <p className="text-xs text-text-muted">
            More than one copy is perfectly fine (different editions or covers) —
            this just flags books that look added twice. Delete any you didn&apos;t
            mean to keep.
          </p>
          {groups.map((g) => (
            <div key={g[0].id}>
              <p className="mb-1.5 text-sm font-bold">
                {g[0].title}
                {g[0].authors[0] ? (
                  <span className="font-normal text-text-muted"> · {g[0].authors[0]}</span>
                ) : null}
              </p>
              <ul className="space-y-1.5">
                {g.map((b, i) => (
                  <li
                    key={b.id}
                    className="flex items-center gap-3 rounded-lg border-2 border-outline bg-surface px-2.5 py-1.5"
                  >
                    <Link href={`/book/${b.id}`} className="w-7 shrink-0">
                      <BookCover title={b.title} coverUrl={b.cover_url} />
                    </Link>
                    <div className="min-w-0 flex-1 text-xs">
                      <span className="font-semibold">
                        {i === 0 ? "Original" : `Copy ${i + 1}`}
                      </span>
                      <span className="text-text-muted">
                        {" "}· added {format(parseISO(b.created_at), "d MMM yyyy")}
                      </span>
                    </div>
                    <Link
                      href={`/book/${b.id}`}
                      className="chip shrink-0 text-text-muted"
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => remove(b)}
                      aria-label="Delete this copy"
                      className="shrink-0 rounded-lg p-1.5 text-text-muted hover:bg-surface-2 hover:text-riso-pink"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
