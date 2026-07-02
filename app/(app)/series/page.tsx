"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Layers, BookPlus } from "lucide-react";
import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { useBooks } from "@/lib/queries";
import { seriesGroups } from "@/lib/series";

export default function SeriesPage() {
  const { data: books = [], isLoading } = useBooks();
  const groups = useMemo(() => seriesGroups(books), [books]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold misreg">Series</h1>
        <p className="mt-1 text-text-muted">
          Your runs and box sets — and the volumes you&apos;re still missing.
        </p>
      </header>

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No series yet"
          hint="Give books a “Series” name and number (in the edit form) and they'll line up here."
          action={
            <Link href="/library" className="btn-primary">
              Browse library
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.name} className="card p-5">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl font-extrabold">{g.name}</h2>
                <span className="text-sm font-semibold text-text-muted">
                  {g.readCount}/{g.total} read
                  {g.missing.length > 0 && (
                    <span className="ml-2 chip bg-riso-pink/15">
                      missing {g.missing.map((n) => `#${n}`).join(", ")}
                    </span>
                  )}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                {g.books.map((b) => (
                  <Link
                    key={b.id}
                    href={`/book/${b.id}`}
                    title={b.title}
                    className="group w-16"
                  >
                    <div className="relative">
                      <BookCover
                        title={b.title}
                        authors={b.authors}
                        coverUrl={b.cover_url}
                        className="transition-transform group-hover:-translate-y-1"
                      />
                      {b.series_index != null && (
                        <span className="absolute -left-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-outline bg-riso-yellow px-1 text-[0.62rem] font-extrabold text-[#1a1430]">
                          #{b.series_index}
                        </span>
                      )}
                      {b.read_status === "read" && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-outline bg-riso-blue text-[0.6rem] font-extrabold text-white">
                          ✓
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
                {/* Placeholders for the gaps */}
                {g.missing.map((n) => (
                  <div
                    key={`gap-${n}`}
                    title={`Missing #${n}`}
                    className="flex aspect-[2/3] w-16 flex-col items-center justify-center rounded-lg border-[2.5px] border-dashed border-outline/50 text-text-muted"
                  >
                    <BookPlus className="h-5 w-5" />
                    <span className="mt-1 text-[0.62rem] font-bold">#{n}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
