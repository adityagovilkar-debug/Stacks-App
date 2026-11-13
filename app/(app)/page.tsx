"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Flame,
  BookOpen,
  ScanLine,
  Dice5,
  ArrowRight,
  Sparkles,
  Quote as QuoteIcon,
  Timer as TimerIcon,
} from "lucide-react";
import { BookCover } from "@/components/BookCover";
import { ProgressBar } from "@/components/ProgressBar";
import { QuickLog } from "@/components/QuickLog";
import { StatusStamp } from "@/components/StatusStamp";
import { SkeletonList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useAllReadThroughs, useBooks, useProfile, useQuotes, useSessions } from "@/lib/queries";
import { openLogSession, startTimer } from "@/lib/events";
import {
  currentStreak,
  pagesOn,
  minutesOn,
  todayISO,
  readsInYear,
  series,
  readingProgress,
  estimateTimeLeft,
  fmtDuration,
  isAudiobook,
  isLocationEbook,
} from "@/lib/stats";
import type { Book, ReadingSession } from "@/lib/types";

export default function DashboardPage() {
  const { data: books = [], isLoading } = useBooks();
  const { data: sessions = [] } = useSessions();
  const { data: reads = [] } = useAllReadThroughs();
  const { data: profile } = useProfile();
  const { data: quotes = [] } = useQuotes();

  const randomQuote = useMemo(
    () => (quotes.length ? quotes[Math.floor(Math.random() * quotes.length)] : null),
    [quotes],
  );

  const firstName = (profile?.full_name ?? "").split(" ")[0];
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const today = todayISO();
  const pagesToday = pagesOn(today, sessions);
  const minsToday = minutesOn(today, sessions);
  const streak = currentStreak(sessions, profile?.rest_days_per_week ?? 0);
  const goalPages = profile?.goal_pages_per_day ?? 25;
  const goalMinutes = profile?.goal_minutes_per_day ?? 20;
  // Hitting either goal counts — a day of audiobook listening logs 0 pages
  // but is absolutely a reading day.
  const pagePct = (pagesToday / Math.max(1, goalPages)) * 100;
  const minPct = goalMinutes > 0 ? (minsToday / goalMinutes) * 100 : 0;
  const todayPct = Math.max(pagePct, minPct);
  const goalMet = todayPct >= 100;

  const year = new Date().getFullYear();
  const booksThisYear = readsInYear(reads, year).length;

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
    <div className="space-y-6">
      {/* Greeting — one quiet line; the book you're reading leads */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold misreg sm:text-3xl">
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm font-semibold text-text-muted">
            {streak > 0
              ? `${streak}-day streak — keep it lit.`
              : "A few pages today is all it takes to start a streak."}
          </p>
        </div>
        <button onClick={() => openLogSession()} className="btn-primary hidden lg:inline-flex">
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
          {/* Now reading */}
          {reading.length === 0 ? (
            <p className="card-soft p-4 text-sm text-text-muted">
              Nothing in progress.{" "}
              <Link href="/queue" className="font-bold text-riso-blue">
                Start something from your queue
              </Link>{" "}
              or{" "}
              <Link href="/next" className="font-bold text-riso-blue">
                let us pick one
              </Link>
              .
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <NowReading book={reading[0]} sessions={sessions} />
              {reading.length > 1 && (
                <div className="space-y-2">
                  {reading.slice(1).map((b) => (
                    <AlsoReading key={b.id} book={b} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Today · streak · this year — one compact strip */}
          <div className="grid grid-cols-3 gap-2.5">
            <Link href="/stats" className="card flex flex-col items-center justify-center p-2.5 text-center pop-sm">
              <span className="font-display text-2xl font-extrabold">
                {pagesToday}
                <span className="text-sm text-text-muted">/{goalPages}</span>
              </span>
              <span className="text-[0.7rem] font-bold text-text-muted">
                {goalMet ? "goal met 🎉" : minsToday > 0 ? `pages · ${minsToday} min` : "pages today"}
              </span>
              <ProgressBar percent={todayPct} height={6} className="mt-1.5" />
            </Link>
            <Link href="/stats" className="card flex flex-col items-center justify-center p-2.5 text-center pop-sm">
              <span className="flex items-center gap-1 font-display text-2xl font-extrabold text-riso-orange">
                <Flame className="h-5 w-5" />
                {streak}
              </span>
              <span className="text-[0.7rem] font-bold text-text-muted">day streak</span>
            </Link>
            <Link href="/wrapped" className="card flex flex-col items-center justify-center p-2.5 text-center pop-sm">
              <span className="font-display text-2xl font-extrabold text-riso-pink">{booksThisYear}</span>
              <span className="text-[0.7rem] font-bold text-text-muted">read in {year}</span>
            </Link>
          </div>

          {/* Up next + recently finished */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section>
              <SectionHead title="Up next" href="/queue" />
              <div className="flex gap-2.5">
                {queue.map((b) => (
                  <Link key={b.id} href={`/book/${b.id}`} className="w-[17%] max-w-20 shrink-0" title={b.title}>
                    <BookCover title={b.title} authors={b.authors} coverUrl={b.cover_url} />
                  </Link>
                ))}
                <Link
                  href="/next"
                  className="flex aspect-[2/3] w-[17%] max-w-20 shrink-0 flex-col items-center justify-center rounded-lg border-[2.5px] border-dashed border-outline/50 p-1 text-center text-[0.65rem] font-bold text-text-muted hover:border-riso-pink hover:text-riso-pink"
                >
                  <Dice5 className="mb-1 h-5 w-5" />
                  Surprise me
                </Link>
              </div>
              {queue.length === 0 && (
                <p className="mt-2 text-xs text-text-muted">
                  Your queue is empty —{" "}
                  <Link href="/library" className="font-bold text-riso-blue">
                    queue a few books
                  </Link>
                  .
                </p>
              )}
            </section>

            <section>
              <SectionHead title="Recently finished" href="/library?status=read" />
              {recent.length === 0 ? (
                <p className="card-soft p-4 text-sm text-text-muted">
                  Finished books will show up here.
                </p>
              ) : (
                <div className="flex gap-2.5">
                  {recent.slice(0, 5).map((b) => (
                    <Link key={b.id} href={`/book/${b.id}`} className="w-[17%] max-w-20 shrink-0" title={b.title}>
                      <BookCover title={b.title} authors={b.authors} coverUrl={b.cover_url} />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* A quote from your commonplace book */}
          {randomQuote && (
            <Link href="/quotes" className="card block p-4 transition hover:-translate-y-0.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-riso-purple">
                <QuoteIcon className="h-4 w-4" /> From your shelves
              </div>
              <p className="font-display text-base italic leading-snug">
                “{randomQuote.text}”
              </p>
              <p className="mt-1.5 text-xs font-semibold text-text-muted">
                — {randomQuote.book?.title}
                {randomQuote.page ? `, p. ${randomQuote.page}` : ""}
              </p>
            </Link>
          )}

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
        <Link href={href} className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-riso-blue hover:underline">
          See all <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

// The book you're reading, front and centre: progress, time left, and
// "now on page ✓" right there.
function NowReading({ book, sessions }: { book: Book; sessions: ReadingSession[] }) {
  const progress = readingProgress(book);
  const estimate = estimateTimeLeft(book, sessions);
  const left =
    estimate && estimate.unitsLeft > 0 && estimate.minutesLeft != null
      ? fmtDuration(estimate.minutesLeft)
      : null;
  const where = isAudiobook(book)
    ? book.duration_minutes
      ? `${fmtDuration(book.audio_position_minutes ?? 0)} of ${fmtDuration(book.duration_minutes)}`
      : null
    : isLocationEbook(book)
      ? `loc. ${(book.current_location ?? 0).toLocaleString()} of ${book.total_locations?.toLocaleString()}`
      : book.page_count
        ? `p. ${book.current_page ?? 0} of ${book.page_count}`
        : null;

  return (
    <section className="card p-3.5">
      <div className="flex gap-3.5">
        <Link href={`/book/${book.id}`} className="w-[84px] shrink-0">
          <BookCover title={book.title} authors={book.authors} coverUrl={book.cover_url} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[0.7rem] font-extrabold uppercase tracking-widest text-riso-pink">Now reading</span>
          <Link href={`/book/${book.id}`} className="line-clamp-2 font-display text-xl font-extrabold leading-tight">
            {book.title}
          </Link>
          <span className="truncate text-sm text-text-muted">{book.authors.join(", ")}</span>
          {progress != null ? (
            <>
              <ProgressBar percent={progress} height={10} color="var(--color-riso-orange)" className="mt-1" />
              <span className="text-xs font-semibold text-text-muted">
                {[where, `${progress}%`, left ? `≈${left} left` : null].filter(Boolean).join(" · ")}
              </span>
            </>
          ) : (
            <StatusStamp status="reading" className="mt-1 w-fit" />
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <QuickLog book={book} wide />
        </div>
        <button
          onClick={() => startTimer({ id: book.id, title: book.title })}
          className="btn-outline h-11 min-h-0 w-11 shrink-0 p-0"
          aria-label="Start timer"
        >
          <TimerIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => openLogSession(book)}
          className="btn-outline h-11 min-h-0 w-11 shrink-0 p-0"
          aria-label="Log with details"
        >
          <BookOpen className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}

// Any other books in progress: one slim row each.
function AlsoReading({ book }: { book: Book }) {
  const progress = readingProgress(book);
  return (
    <div className="card-soft flex items-center gap-3 p-2.5">
      <Link href={`/book/${book.id}`} className="w-9 shrink-0">
        <BookCover title={book.title} authors={book.authors} coverUrl={book.cover_url} />
      </Link>
      <Link href={`/book/${book.id}`} className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-extrabold">{book.title}</p>
        <p className="text-xs text-text-muted">Also reading{progress != null ? ` · ${progress}%` : ""}</p>
      </Link>
      <button
        onClick={() => openLogSession(book)}
        className="min-h-11 px-2 text-sm font-bold text-riso-blue"
      >
        Log
      </button>
    </div>
  );
}
