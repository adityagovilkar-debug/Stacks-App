"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Search, Layers } from "lucide-react";
import { BookCard } from "@/components/BookCard";
import { SkeletonGrid } from "@/components/Skeleton";
import { useBooks, useRecommendations } from "@/lib/queries";
import { booksByAuthor } from "@/lib/authors";
import { seriesGroups } from "@/lib/series";

const ORDER: Record<string, number> = { reading: 0, on_hold: 1, unread: 2, read: 3, abandoned: 4 };

export default function AuthorPage() {
  const raw = useParams().name as string;
  const name = decodeURIComponent(raw);
  const { data: books = [], isLoading } = useBooks();
  const { data: recs = [] } = useRecommendations();

  const theirs = useMemo(
    () =>
      booksByAuthor(books, name).sort(
        (a, b) =>
          (ORDER[a.read_status] ?? 9) - (ORDER[b.read_status] ?? 9) ||
          (a.published_year ?? 9999) - (b.published_year ?? 9999),
      ),
    [books, name],
  );
  const series = useMemo(() => seriesGroups(theirs), [theirs]);
  const shownName = theirs[0]?.authors.find((a) => a.toLowerCase() === name.toLowerCase()) ?? name;

  const read = theirs.filter((b) => b.times_read > 0 || b.read_status === "read").length;
  const wish = theirs.filter((b) => b.ownership === "wishlist").length;
  const rated = theirs.map((b) => b.rating).filter((r): r is number => r != null && r > 0);
  const avg = rated.length ? rated.reduce((n, r) => n + r, 0) / rated.length : null;
  const ids = new Set(theirs.map((b) => b.id));
  const recommendedBy = [
    ...new Set(recs.filter((r) => r.direction === "from" && ids.has(r.book_id)).map((r) => r.person)),
  ];

  return (
    <div className="space-y-6">
      <Link href="/authors" className="inline-flex items-center gap-1.5 text-sm font-bold text-text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4" /> Authors
      </Link>

      <header>
        <h1 className="font-display text-3xl font-extrabold misreg">{shownName}</h1>
        <p className="mt-1 text-text-muted">
          {theirs.length} book{theirs.length === 1 ? "" : "s"} · {read} read
          {avg ? ` · your average ${avg.toFixed(1)}★` : ""}
          {wish ? ` · ${wish} on your wishlist` : ""}
        </p>
        {recommendedBy.length > 0 && (
          <p className="mt-1 text-sm text-text-muted">
            Recommended to you by <b className="text-text">{recommendedBy.join(", ")}</b>
          </p>
        )}
        <Link
          href={`/add?search=${encodeURIComponent(shownName)}`}
          className="btn-outline mt-3 inline-flex"
        >
          <Search className="h-5 w-5" /> Find more by {shownName.split(" ").slice(-1)[0]}
        </Link>
      </header>

      {series.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-extrabold">
            <Layers className="h-5 w-5 text-riso-purple" /> Series
          </h2>
          <ul className="space-y-1.5 text-sm">
            {series.map((s) => (
              <li key={s.name} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-bold">{s.name}</span>
                <span className="text-text-muted">
                  {s.readCount}/{s.total} read
                  {s.missing.length ? ` · missing ${s.missing.map((n) => "#" + n).join(", ")}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/series" className="mt-2 inline-block text-sm font-bold text-riso-blue hover:underline">
            Open the series tracker →
          </Link>
        </section>
      )}

      {isLoading ? (
        <SkeletonGrid count={6} />
      ) : theirs.length === 0 ? (
        <p className="card-soft p-4 text-sm text-text-muted">No books by {name} in your library.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {theirs.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      )}
    </div>
  );
}
