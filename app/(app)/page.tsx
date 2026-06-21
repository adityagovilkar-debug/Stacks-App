"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Flame,
  BookOpen,
  ScanLine,
  ListChecks,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { BookCover } from "@/components/BookCover";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusStamp } from "@/components/StatusStamp";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useBooks, useProfile, useSessions } from "@/lib/queries";
import { openLogSession } from "@/lib/events";
import {
  currentStreak,
  pagesOn,
  minutesOn,
  todayISO,
  series,
  readingProgress,
} from "@/lib/stats";
import type { Book } from "@/lib/types";

export default function DashboardPage() {
  const { data: books = [], isLoading } = useBooks();
  const { data: sessions = [] } = useSessions();
  const { data: profile } = useProfile();

  const firstName = (profile?.full_name ?? "").split(" ")[0];
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const today = todayISO();
  const pagesToday = pagesOn(today, sessions);
  const minsToday = minutesOn(today, sessions);
  const streak = currentStreak(sessions);
  const goalPages = profile?.goal_pages_per_day ?? 25;

  const year = new Date().getFullYear();
  const booksThisYear = books.filter(
    (b) => b.read_status === "read" && b.finished_on?.startsWith(String(year)),
  ).length;

  const reading = useMemo(
    () =>
      books
        .filter((b) => b.read_status === "reading")
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [books],
  );
  const queue = useMemo(
    () =>
      books
        .filter((b) => b.queue_position != null)
        .sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0))
        .slice(0, 4),
    [books],
  );
  const recent = useMemo(
    () =>
      books
        .filter((b) => b.read_status === "read" && b.finished_on)
        .sort((a, b) => (b.finished_on ?? "").localeCompare(a.finished_on ?? ""))
        .slice(0, 6),
    [books],
  );
  const pagesThisWeek = useMemo(
    () => series(sessions, 7, "day").reduce((n, p) => n + p.pages, 0),
    [sessions],
  );

  if (isLoading) return <SkeletonList rows={6} />;

  const empty = books.length === 0;

  return (
    <div className="space-y-7">
      {/* Greeting */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold misreg">
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-text-muted">
            {streak > 0
              ? `You're on a ${streak}-day reading streak. Keep it lit.`
              : "A few pages today is all it takes to start a streak."}
          </p>
        </div>
        <button onClick={() => openLogSession()} className="btn-primary">
          <BookOpen className="h-5 w-5" /> Log reading
        </button>
      </header>

      {empty ? (
        <EmptyState
          icon={ScanLine}
          title="Let's build your library"
          hint="Scan a barcode or add your first book — then track your reading and watch the habit grow."
          action={
            <Link href="/add" className="btn-primary">
              <ScanLine className="h-5 w-5" /> Add your first book
            </Link>
          }
        />
      ) : (
        <>
          {/* Today + stats */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="card p-4 sm:col-span-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-bold">Today</span>
                <span className="text-xs font-semibold text-text-muted">
                  {pagesToday}/{goalPages} pp
                </span>
              </div>
              <ProgressBar percent={(pagesToday / Math.max(1, goalPages)) * 100} />
              <p className="mt-2 text-xs text-text-muted">
                {minsToday > 0 ? `${minsToday} min · ` : ""}
                {pagesToday >= goalPages
                  ? "Daily goal met! 🎉"
                  : `${Math.max(0, goalPages - pagesToday)} pages to your goal`}
              </p>
            </div>
            <StatTile icon={<Flame className="h-5 w-5 text-riso-orange" />} value={`${streak}`} label="day streak" />
            <StatTile icon={<Sparkles className="h-5 w-5 text-riso-pink" />} value={`${booksThisYear}`} label={`read in ${year}`} />
          </div>

          {/* Currently reading */}
          <section>
            <SectionHead title="Continue reading" />
            {reading.length === 0 ? (
              <p className="card-soft p-4 text-sm text-text-muted">
                Nothing in progress.{" "}
                <Link href="/queue" className="font-bold text-riso-blue">
                  Start something from your queue
                </Link>
                .
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {reading.map((b) => (
                  <ReadingRow key={b.id} book={b} />
                ))}
              </div>
            )}
          </section>

          {/* Up next + recently finished */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section>
              <SectionHead title="Up next" href="/queue" />
              {queue.length === 0 ? (
                <p className="card-soft p-4 text-sm text-text-muted">
                  Your queue is empty.{" "}
                  <Link href="/library" className="font-bold text-riso-blue">
                    Queue a few books
                  </Link>
                  .
                </p>
              ) : (
                <ul className="space-y-2">
                  {queue.map((b, i) => (
                    <li key={b.id} className="card-soft flex items-center gap-3 p-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-outline bg-riso-yellow text-xs font-extrabold text-[#1a1430]">
                        {i + 1}
                      </span>
                      <Link href={`/book/${b.id}`} className="w-8 shrink-0">
                        <BookCover title={b.title} authors={b.authors} coverUrl={b.cover_url} />
                      </Link>
                      <Link href={`/book/${b.id}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{b.title}</p>
                        <p className="truncate text-xs text-text-muted">{b.authors.join(", ")}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <SectionHead title="Recently finished" href="/library?status=read" />
              {recent.length === 0 ? (
                <p className="card-soft p-4 text-sm text-text-muted">
                  Finished books will show up here.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {recent.map((b) => (
                    <Link key={b.id} href={`/book/${b.id}`} className="w-16" title={b.title}>
                      <BookCover title={b.title} authors={b.authors} coverUrl={b.cover_url} />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Footer stat */}
          <div className="card halftone flex items-center gap-3 overflow-hidden p-4" style={{ backgroundColor: "var(--color-riso-yellow)" }}>
            <Sparkles className="h-7 w-7 shrink-0 text-[#1a1430]" />
            <p className="font-display font-extrabold text-[#1a1430]">
              {pagesThisWeek} pages this week
              <span className="block text-sm font-semibold text-[#1a1430]/70">
                across your whole library of {books.length} books.
              </span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function SectionHead({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-xl font-extrabold">{title}</h2>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-bold text-riso-blue hover:underline">
          See all <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="card flex flex-col items-center justify-center p-4 text-center">
      <div className="flex items-center gap-1.5 font-display text-3xl font-extrabold">
        {icon} {value}
      </div>
      <div className="text-xs font-bold text-text-muted">{label}</div>
    </div>
  );
}

function ReadingRow({ book }: { book: Book }) {
  const progress = readingProgress(book);
  return (
    <div className="card flex items-center gap-3 p-3">
      <Link href={`/book/${book.id}`} className="w-12 shrink-0">
        <BookCover title={book.title} authors={book.authors} coverUrl={book.cover_url} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/book/${book.id}`} className="block">
          <p className="line-clamp-2 font-display text-sm font-bold leading-tight">
            {book.title}
          </p>
          <p className="truncate text-xs text-text-muted">{book.authors.join(", ")}</p>
        </Link>
        {progress != null ? (
          <div className="mt-1.5">
            <ProgressBar percent={progress} height={8} color="var(--color-riso-orange)" />
            <p className="mt-1 text-[0.65rem] font-semibold text-text-muted">
              {book.current_page}/{book.page_count} · {progress}%
            </p>
          </div>
        ) : (
          <div className="mt-1">
            <StatusStamp status="reading" />
          </div>
        )}
      </div>
      <button
        onClick={() => openLogSession(book)}
        className="shrink-0 rounded-lg border-2 border-outline bg-riso-blue p-2 text-white pop-sm"
        aria-label="Log reading"
      >
        <BookOpen className="h-4 w-4" />
      </button>
    </div>
  );
}
