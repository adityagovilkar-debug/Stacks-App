"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MapPin, PackageOpen, Settings } from "lucide-react";
import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonGrid } from "@/components/Skeleton";
import { useBooks, useLocations } from "@/lib/queries";
import { buildPathMap } from "@/lib/locations";
import type { Book } from "@/lib/types";

export default function ShelfPage() {
  const { data: books = [], isLoading } = useBooks();
  const { data: locations = [] } = useLocations();

  const paths = useMemo(() => buildPathMap(locations), [locations]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; books: Book[] }>();
    for (const b of books) {
      const key = b.location_id ?? "__none";
      const label = b.location_id
        ? paths.get(b.location_id) ?? "Unknown spot"
        : "Not shelved yet";
      const g = map.get(key) ?? { label, books: [] };
      g.books.push(b);
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => {
      // unshelved last
      if (a.label.startsWith("Not shelved")) return 1;
      if (b.label.startsWith("Not shelved")) return -1;
      return a.label.localeCompare(b.label);
    });
  }, [books, paths]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold misreg">Shelf map</h1>
          <p className="mt-1 text-text-muted">Where every book lives in your home.</p>
        </div>
        <Link href="/settings" className="btn-outline">
          <Settings className="h-5 w-5" /> Manage locations
        </Link>
      </header>

      {isLoading ? (
        <SkeletonGrid count={8} />
      ) : books.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No books to place yet"
          hint="Add books and assign each a location to see your shelf map."
          action={
            <Link href="/add" className="btn-primary">
              Add a book
            </Link>
          }
        />
      ) : (
        <div className="space-y-7">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-outline bg-riso-yellow text-[#1a1430]">
                  <MapPin className="h-4 w-4" />
                </span>
                {g.label}
                <span className="chip bg-surface-2">{g.books.length}</span>
              </h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
                {g.books.map((b) => (
                  <Link key={b.id} href={`/book/${b.id}`} title={b.title} className="group">
                    <BookCover
                      title={b.title}
                      authors={b.authors}
                      coverUrl={b.cover_url}
                      className="transition-transform group-hover:-translate-y-1 group-hover:[box-shadow:var(--shadow-riso-sm)]"
                    />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
