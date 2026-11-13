"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { useBooks } from "@/lib/queries";
import { authorHref, authorIndex } from "@/lib/authors";
import { cn } from "@/lib/utils";

type Sort = "books" | "name" | "read" | "rating";

export default function AuthorsPage() {
  const { data: books = [], isLoading } = useBooks();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("books");

  const authors = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = authorIndex(books).filter((a) => !needle || a.name.toLowerCase().includes(needle));
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "read") return b.read - a.read || b.books.length - a.books.length;
      if (sort === "rating") return (b.avgRating ?? -1) - (a.avgRating ?? -1);
      return b.books.length - a.books.length || a.name.localeCompare(b.name);
    });
  }, [books, q, sort]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-extrabold misreg">Authors</h1>
        <p className="mt-1 text-text-muted">Everyone on your shelves, and how much of them you&apos;ve read.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
          <input
            className="input pl-10"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find an author…"
          />
        </div>
        <div className="inline-flex rounded-xl border-2 border-outline bg-surface-2 p-1">
          {(
            [
              ["books", "Most books"],
              ["read", "Most read"],
              ["rating", "Top rated"],
              ["name", "A–Z"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-bold transition",
                sort === k ? "bg-riso-blue text-white" : "text-text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <SkeletonList rows={6} />
      ) : authors.length === 0 ? (
        <EmptyState icon={Users} title="No authors yet" hint="Add books and their authors show up here." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {authors.map((a) => (
            <li key={a.name}>
              <Link href={authorHref(a.name)} className="card-soft flex items-center gap-3 p-3 transition hover:border-riso-blue">
                <div className="flex shrink-0 -space-x-4">
                  {a.books.slice(0, 3).map((b) => (
                    <div key={b.id} className="w-9">
                      <BookCover title={b.title} authors={b.authors} coverUrl={b.cover_url} />
                    </div>
                  ))}
                </div>
                <div className="min-w-0 flex-1 pl-2">
                  <p className="truncate font-display font-extrabold">{a.name}</p>
                  <p className="text-xs text-text-muted">
                    {a.books.length} book{a.books.length === 1 ? "" : "s"} · {a.read} read
                    {a.avgRating ? ` · ${a.avgRating.toFixed(1)}★` : ""}
                    {a.reading ? " · reading now" : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
