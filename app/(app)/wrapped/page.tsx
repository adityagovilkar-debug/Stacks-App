"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, BookOpen, Zap, Trophy, Ruler, Star } from "lucide-react";
import { BookCover } from "@/components/BookCover";
import { RatingStars } from "@/components/RatingStars";
import { EmptyState } from "@/components/EmptyState";
import { useBooks, useSessions } from "@/lib/queries";
import { availableYears, wrappedStats } from "@/lib/wrapped";
import { cn } from "@/lib/utils";

export default function WrappedPage() {
  const { data: books = [] } = useBooks();
  const { data: sessions = [] } = useSessions();

  const years = useMemo(() => availableYears(books, sessions), [books, sessions]);
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear());
  const w = useMemo(() => wrappedStats(books, sessions, year), [books, sessions, year]);

  const empty = w.booksFinished === 0 && w.pagesRead === 0;
  const PIE = ["#0b63f6", "#ff4f9a", "#ffd23f", "#ff6f3c", "#7b5cff"];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold misreg">
            {year} in books
          </h1>
          <p className="mt-1 text-text-muted">Your reading year, wrapped.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={cn("chip", y === year ? "bg-riso-blue text-white" : "")}
            >
              {y}
            </button>
          ))}
        </div>
      </header>

      {empty ? (
        <EmptyState
          icon={Sparkles}
          title={`Nothing logged for ${year} yet`}
          hint="Finish a book or log some reading this year and your Wrapped will fill in."
          action={
            <Link href="/" className="btn-primary">
              Back to home
            </Link>
          }
        />
      ) : (
        <>
          {/* Hero */}
          <section
            className="card halftone overflow-hidden p-6 text-center"
            style={{ backgroundColor: "var(--color-riso-pink)" }}
          >
            <p className="font-display text-6xl font-extrabold text-white">
              {w.booksFinished}
            </p>
            <p className="mt-1 font-display text-lg font-bold text-white/90">
              {w.booksFinished === 1 ? "book finished" : "books finished"} in {year}
            </p>
          </section>

          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={<BookOpen className="h-5 w-5 text-riso-blue" />} value={w.pagesRead.toLocaleString()} label="pages read" />
            <Stat icon={<Zap className="h-5 w-5 text-riso-orange" />} value={`${Math.round(w.minutes / 60)}h`} label="time reading" />
            <Stat icon={<Sparkles className="h-5 w-5 text-riso-purple" />} value={`${w.daysRead}`} label="days read" />
            <Stat icon={<Star className="h-5 w-5 text-riso-pink" />} value={w.avgRating ? w.avgRating.toFixed(1) : "—"} label="avg rating" />
          </div>

          {/* Superlatives */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {w.highestRated && (
              <Superlative
                icon={<Trophy className="h-5 w-5 text-riso-yellow" />}
                label="Top rated"
                book={w.highestRated}
                extra={<RatingStars value={w.highestRated.rating} size={14} />}
              />
            )}
            {w.longest && (
              <Superlative
                icon={<Ruler className="h-5 w-5 text-riso-blue" />}
                label="Chunkiest"
                book={w.longest}
                extra={
                  <span className="text-xs font-semibold text-text-muted">
                    {w.longest.page_count} pages
                  </span>
                }
              />
            )}
            {w.fastest && (
              <Superlative
                icon={<Zap className="h-5 w-5 text-riso-orange" />}
                label="Fastest read"
                book={w.fastest.book}
                extra={
                  <span className="text-xs font-semibold text-text-muted">
                    ~{Math.round(w.fastest.speed)} pages/hr
                  </span>
                }
              />
            )}
          </div>

          {/* Top genres + authors */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="mb-3 font-display text-lg font-extrabold">Top genres</h2>
              {w.topGenres.length ? (
                <div className="flex flex-wrap gap-2">
                  {w.topGenres.map((g, i) => (
                    <span
                      key={g.name}
                      className="chip"
                      style={{ backgroundColor: PIE[i % PIE.length] + "26" }}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: PIE[i % PIE.length] }}
                      />
                      {g.name} · {g.value}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">Tag finished books with genres to see this.</p>
              )}
            </section>

            <section className="card p-5">
              <h2 className="mb-3 font-display text-lg font-extrabold">Top authors</h2>
              {w.topAuthors.length ? (
                <ul className="space-y-1.5">
                  {w.topAuthors.map((a) => (
                    <li key={a.name} className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{a.name}</span>
                      <span className="chip bg-surface-2">{a.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-muted">No finished books yet.</p>
              )}
            </section>
          </div>

          {/* Shelf of finished books */}
          {w.finishedBooks.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-lg font-extrabold">
                Everything you finished
              </h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
                {w.finishedBooks.map((b) => (
                  <Link key={b.id} href={`/book/${b.id}`} title={b.title}>
                    <BookCover title={b.title} authors={b.authors} coverUrl={b.cover_url} />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 font-display text-2xl font-extrabold">
        {icon} {value}
      </div>
      <div className="text-xs font-bold text-text-muted">{label}</div>
    </div>
  );
}

function Superlative({
  icon,
  label,
  book,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  book: { id: string; title: string; authors: string[]; cover_url: string | null };
  extra?: React.ReactNode;
}) {
  return (
    <Link href={`/book/${book.id}`} className="card flex items-center gap-3 p-4">
      <div className="w-12 shrink-0">
        <BookCover title={book.title} authors={book.authors} coverUrl={book.cover_url} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
          {icon} {label}
        </div>
        <p className="line-clamp-2 font-display text-sm font-bold leading-tight">
          {book.title}
        </p>
        <div className="mt-0.5">{extra}</div>
      </div>
    </Link>
  );
}
