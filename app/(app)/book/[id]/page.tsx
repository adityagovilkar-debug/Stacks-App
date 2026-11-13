"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  Pencil,
  Trash2,
  ListChecks,
  ListX,
  RotateCcw,
  Bookmark,
  Clock,
  MapPin,
  Timer as TimerIcon,
} from "lucide-react";
import { BookCover } from "@/components/BookCover";
import { StatusStamp } from "@/components/StatusStamp";
import { RatingStars } from "@/components/RatingStars";
import { ProgressBar } from "@/components/ProgressBar";
import { SkeletonList } from "@/components/Skeleton";
import {
  useBook,
  useBookSessions,
  useArchiveBook,
  useDeleteBook,
  useRestoreBook,
  useLocations,
  usePatchBook,
  useReadAgain,
  useSessions,
  useSetReadStatus,
  useAddToQueue,
  useRemoveFromQueue,
} from "@/lib/queries";
import { buildPathMap } from "@/lib/locations";
import { openEditBook, openFinishBook, openLogSession, startTimer } from "@/lib/events";
import {
  readingProgress,
  estimateTimeLeft,
  fmtDuration,
  isAudiobook,
  isLocationEbook,
} from "@/lib/stats";
import { QuotesSection } from "@/components/QuotesSection";
import { ReadThroughsSection } from "@/components/ReadThroughsSection";
import { LoanSection } from "@/components/LoanSection";
import { ReadingHistory } from "@/components/ReadingHistory";
import { QuickLog } from "@/components/QuickLog";
import { chooseSheet } from "@/lib/ask";
import { RecommendationsSection } from "@/components/RecommendationsSection";
import { EditionsSection } from "@/components/EditionsSection";
import { authorHref } from "@/lib/authors";
import {
  FORMAT_LABEL,
  OWNERSHIP_LABEL,
  READ_STATUS_LABEL,
  palette,
  type ReadStatus,
} from "@/lib/types";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

type Tab = "reading" | "notes" | "details" | "history";
const TABS: { key: Tab; label: string }[] = [
  { key: "reading", label: "Reading" },
  { key: "notes", label: "Notes & quotes" },
  { key: "details", label: "Details" },
  { key: "history", label: "History" },
];

export default function BookDetailPage() {
  const router = useRouter();
  const id = useParams().id as string;
  const { data: book, isLoading } = useBook(id);
  const { data: sessions = [] } = useBookSessions(id);
  const { data: allSessions = [] } = useSessions();
  const { data: locations = [] } = useLocations();

  const setStatus = useSetReadStatus();
  const readAgain = useReadAgain();
  const patch = usePatchBook();
  const archive = useArchiveBook();
  const del = useDeleteBook();
  const restore = useRestoreBook();
  const addQ = useAddToQueue();
  const removeQ = useRemoveFromQueue();

  const [bookmark, setBookmark] = useState("");
  const [review, setReview] = useState("");
  const [tab, setTab] = useState<Tab>("reading");

  // Show the slim hero in the sticky bar once the big hero scrolls away.
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroGone, setHeroGone] = useState(false);
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setHeroGone(!e.isIntersecting), {
      rootMargin: "-110px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [book?.id]);

  // Re-sync the bookmark field whenever the saved position changes (e.g. after
  // logging a session with "now on page"), so it never shows a stale value.
  useEffect(() => {
    if (book) {
      const mark = isAudiobook(book)
        ? book.audio_position_minutes
        : isLocationEbook(book)
          ? book.current_location
          : book.current_page;
      setBookmark(mark != null ? String(mark) : "");
    }
  }, [book?.id, book?.current_page, book?.audio_position_minutes, book?.current_location]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (book) setReview(book.review ?? "");
  }, [book?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <SkeletonList rows={5} />;
  if (!book)
    return (
      <div className="py-16 text-center text-text-muted">
        <p>That book isn&apos;t here.</p>
        <Link href="/library" className="btn-outline mt-4 inline-flex">
          Back to library
        </Link>
      </div>
    );

  const progress = readingProgress(book);
  const audio = isAudiobook(book);
  const loc = isLocationEbook(book);
  const estimate =
    book.read_status === "reading" ? estimateTimeLeft(book, allSessions) : null;
  const locPath = book.location_id
    ? buildPathMap(locations).get(book.location_id)
    : null;

  function saveBookmark() {
    const v = bookmark.trim() === "" ? null : Number(bookmark);
    patch.mutate({
      id: book!.id,
      patch: audio
        ? { audio_position_minutes: v }
        : loc
          ? { current_location: v }
          : { current_page: v },
    });
    toast.success("Bookmark updated");
  }
  function saveReview() {
    patch.mutate({ id: book!.id, patch: { review: review.trim() || null } });
    toast.success("Review saved");
  }
  // Removing keeps the reading history; it can be undone here or restored
  // later from Settings → Removed books, where it can also be deleted forever.
  async function remove() {
    const id = book!.id;
    const title = book!.title;
    const choice = await chooseSheet({
      title: `Remove “${title}”?`,
      choices: [
        {
          value: "archive",
          label: "Remove from library",
          hint: "Hidden, but its sessions, reads and quotes stay in your stats. Put it back any time.",
        },
        {
          value: "delete",
          label: "Delete forever",
          hint: "Also deletes its history. Can't be undone.",
          danger: true,
        },
      ],
      confirmLabel: "Remove",
      cancelLabel: "Keep it",
    });
    if (!choice) return;
    if (choice === "delete") {
      del.mutate(id, {
        onSuccess: () => {
          toast.success(`Deleted “${title}” forever`);
          router.push("/library");
        },
      });
      return;
    }
    archive.mutate(id, {
      onSuccess: () => {
        toast.success(`Removed “${title}” from your library`, {
          duration: 6000,
          action: { label: "Undo", onClick: () => restore.mutate(id) },
        });
        router.push("/library");
      },
    });
  }

  return (
    <div className="space-y-6">
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-text-muted hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" /> Library
      </Link>

      {book.archived_at && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-outline bg-riso-yellow/25 px-4 py-3 text-sm">
          <p className="flex-1 font-semibold">
            This book was removed from your library. Its reading history is kept.
          </p>
          <button className="btn-outline" onClick={() => restore.mutate(book.id)}>
            <RotateCcw className="h-4 w-4" /> Put it back
          </button>
        </div>
      )}

      {/* Hero */}
      <div ref={heroRef} className="flex flex-col gap-5 sm:flex-row">
        <div className="w-40 shrink-0 self-center sm:self-start">
          <BookCover
            title={book.title}
            authors={book.authors}
            coverUrl={book.cover_url}
            className="pop"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h1 className="font-display text-3xl font-extrabold leading-tight">
              {book.title}
            </h1>
            {book.subtitle && (
              <p className="mt-1 text-lg text-text-muted">{book.subtitle}</p>
            )}
            {book.authors?.length > 0 && (
              <p className="mt-1 text-base font-semibold">
                {book.authors.map((a, i) => (
                  <span key={a}>
                    {i > 0 ? ", " : ""}
                    <Link href={authorHref(a)} className="decoration-riso-pink decoration-2 underline-offset-4 hover:underline">
                      {a}
                    </Link>
                  </span>
                ))}
              </p>
            )}
            {book.series_name && (
              <p className="mt-1 text-sm text-text-muted">
                {book.series_name}
                {book.series_index != null ? ` #${book.series_index}` : ""}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatusStamp key={book.read_status} status={book.read_status} timesRead={book.times_read} className="stamp-thunk" />
            <RatingStars
              value={book.rating}
              onChange={(v) => patch.mutate({ id: book.id, patch: { rating: v } })}
            />
            <button
              onClick={() => patch.mutate({ id: book.id, patch: { favorite: !book.favorite } })}
              className={cn(
                "chip",
                book.favorite ? "bg-riso-pink/15" : "opacity-70",
              )}
            >
              ♥ {book.favorite ? "Favorite" : "Mark favorite"}
            </button>
          </div>

          {/* Status: one segmented control */}
          <div
            role="radiogroup"
            aria-label="Reading status"
            className="grid grid-cols-5 gap-0.5 rounded-xl border-2 border-outline bg-surface-2 p-1"
          >
            {(Object.keys(READ_STATUS_LABEL) as ReadStatus[]).map((s) => (
              <button
                key={s}
                role="radio"
                aria-checked={book.read_status === s}
                onClick={() =>
                  s === "read" ? openFinishBook(book) : setStatus.mutate({ book, status: s })
                }
                className={cn(
                  "min-h-10 rounded-lg px-0.5 text-[0.72rem] font-bold leading-tight transition sm:text-sm",
                  book.read_status === s
                    ? "bg-riso-orange text-[#1a1430] shadow-[inset_0_0_0_2px_var(--outline)]"
                    : "text-text-muted hover:text-text",
                )}
              >
                {s === "abandoned" ? "DNF" : READ_STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          {/* Book actions (logging lives in the Reading tab) */}
          <div className="flex flex-wrap gap-2 pt-1">
            {book.queue_position != null ? (
              <button onClick={() => removeQ.mutate(book.id)} className="btn-outline">
                <ListX className="h-5 w-5" /> In queue
              </button>
            ) : (
              <button onClick={() => addQ.mutate(book)} className="btn-outline">
                <ListChecks className="h-5 w-5" /> Add to queue
              </button>
            )}
            <button onClick={() => openEditBook(book)} className="btn-outline">
              <Pencil className="h-5 w-5" /> Edit
            </button>
            <button onClick={remove} className="btn-ghost text-riso-pink">
              <Trash2 className="h-5 w-5" /> Remove
            </button>
          </div>
        </div>
      </div>

      {/* Sticky: slim hero (once the big one scrolls away) + tabs */}
      <div className="sticky top-[58px] z-20 -mx-4 border-b-[2.5px] border-outline bg-bg/95 backdrop-blur sm:-mx-6 lg:top-0">
        {heroGone && (
          <div className="flex items-center gap-3 border-b-2 border-border px-4 py-2 sm:px-6">
            <div className="w-7 shrink-0">
              <BookCover title={book.title} authors={book.authors} coverUrl={book.cover_url} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-extrabold">{book.title}</p>
              <p className="text-xs font-semibold text-text-muted">
                {READ_STATUS_LABEL[book.read_status]}
                {progress != null && book.read_status !== "read" ? ` · ${progress}%` : ""}
              </p>
            </div>
            {book.read_status !== "read" && (
              <button onClick={() => openLogSession(book)} className="chip min-h-9 bg-riso-blue px-3 text-white">
                Log
              </button>
            )}
          </div>
        )}
        <nav className="grid grid-cols-4" aria-label="Book sections">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              aria-current={tab === tb.key ? "page" : undefined}
              className={cn(
                "min-h-11 px-1 text-xs font-bold leading-tight transition sm:text-sm",
                tab === tb.key
                  ? "text-text shadow-[inset_0_-5px_0_var(--color-riso-pink)]"
                  : "text-text-muted hover:text-text",
              )}
            >
              {tb.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "reading" && (
        <div className="space-y-6">
      {/* Where you left off — or, once finished, the finished card */}
      {book.read_status === "read" ? (
        <section className="card p-5">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-extrabold">
            <Bookmark className="h-5 w-5 text-riso-blue" /> Finished
          </h2>
          <p className="text-sm text-text-muted">
            {book.finished_on
              ? `Last finished ${format(parseISO(book.finished_on), "d MMM yyyy")}`
              : "Finished (date not recorded)"}
            {book.times_read > 1 ? ` · read ${book.times_read} times` : ""}
          </p>
          <button
            onClick={() =>
              readAgain.mutate(book, {
                onSuccess: () => toast.success("Re-reading — the new read is recorded when you finish"),
              })
            }
            className="btn-outline mt-3"
          >
            <RotateCcw className="h-4 w-4" /> Read it again
          </button>
        </section>
      ) : (
      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold">
          <Bookmark className="h-5 w-5 text-riso-orange" /> Where you left off
        </h2>
        {progress != null && (
          <div className="mb-3">
            <ProgressBar percent={progress} color="var(--color-riso-orange)" />
            <p className="mt-1.5 text-sm font-semibold text-text-muted">
              {audio
                ? `${fmtDuration(book.audio_position_minutes ?? 0)} of ${fmtDuration(book.duration_minutes ?? 0)} · ${progress}%`
                : loc
                  ? `Location ${book.current_location?.toLocaleString()} of ${book.total_locations?.toLocaleString()} · ${progress}%`
                  : `Page ${book.current_page} of ${book.page_count} · ${progress}%`}
            </p>
          </div>
        )}
        {estimate && estimate.unitsLeft > 0 && (
          <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-riso-blue">
            <Clock className="h-4 w-4" />
            {estimate.minutesLeft != null
              ? `≈ ${fmtDuration(estimate.minutesLeft)} left`
              : `${estimate.unitsLeft.toLocaleString()} ${loc ? "locations" : "pages"} left`}
            {estimate.minutesLeft != null && estimate.paceFrom === "book" ? " at this book’s pace" : ""}
            {estimate.daysLeft
              ? ` · about ${estimate.daysLeft} ${estimate.daysLeft === 1 ? "sitting" : "sittings"} at your pace`
              : ""}
          </p>
        )}
        <div className="mb-4 flex items-center gap-2">
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
            className="btn-primary h-11 min-h-0 shrink-0 px-3"
          >
            <BookOpen className="h-5 w-5" /> Log
          </button>
        </div>
        <details className="group">
          <summary className="cursor-pointer list-none text-sm font-bold text-text-muted hover:text-text">
            Set the bookmark by hand…
          </summary>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div>
            <label className="label">
              {audio ? "Current position (min)" : loc ? "Current location" : "Current page"}
            </label>
            <input
              className="input w-32"
              type="number"
              inputMode="numeric"
              value={bookmark}
              onChange={(e) => setBookmark(e.target.value)}
              placeholder={
                audio
                  ? book.duration_minutes
                    ? `of ${book.duration_minutes}`
                    : "minute"
                  : loc
                    ? book.total_locations
                      ? `of ${book.total_locations}`
                      : "location"
                    : book.page_count
                      ? `of ${book.page_count}`
                      : "page"
              }
            />
          </div>
          <button className="btn-outline" onClick={saveBookmark}>
            Update bookmark
          </button>
        </div>
        </details>
      </section>
      )}

      {/* Review */}
      <section className="card p-5">
        <h2 className="mb-3 font-display text-lg font-extrabold">Your review</h2>
        <textarea
          className="textarea"
          rows={4}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="What did you make of it?"
        />
        <button className="btn-outline mt-3" onClick={saveReview}>
          Save review
        </button>
      </section>

      {/* Per-read history (each re-read keeps its own rating + review) */}
      <ReadThroughsSection bookId={book.id} />

        </div>
      )}

      {tab === "notes" && (
        <div className="space-y-6">
          <ReadingHistory book={book} sessions={sessions} mode="notes" />
      {/* Quotes / highlights */}
      <QuotesSection bookId={book.id} />

        </div>
      )}

      {tab === "details" && (
        <div className="space-y-6">
      {/* Metadata + classification */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-display text-lg font-extrabold">Details</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Meta label="Publisher" value={book.publisher} />
            <Meta label="Published" value={book.published_year?.toString()} />
            {loc && (
              <Meta label="Locations" value={book.total_locations?.toLocaleString()} />
            )}
            <Meta
              label={loc ? "Pages (≈)" : "Pages"}
              value={book.page_count?.toString()}
            />
            <Meta label="Language" value={book.language} />
            <Meta label="Format" value={book.format ? FORMAT_LABEL[book.format] : null} />
            <Meta label="Ownership" value={OWNERSHIP_LABEL[book.ownership]} />
            <Meta label="ISBN-13" value={book.isbn13} />
            <Meta label="ISBN-10" value={book.isbn10} />
            <Meta label="Condition" value={book.condition} />
            <Meta
              label="Acquired"
              value={book.acquired_on ? format(parseISO(book.acquired_on), "d MMM yyyy") : null}
            />
            <Meta label="Source" value={book.source} />
            <Meta label="Times read" value={book.times_read ? String(book.times_read) : "0"} />
          </dl>
          {locPath && (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-riso-blue">
              <MapPin className="h-4 w-4" /> {locPath}
            </p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-display text-lg font-extrabold">Classification</h2>
          {book.classification && (
            <p className="mb-3 text-sm">
              <span className="text-text-muted">Shelf: </span>
              <span className="font-bold">{book.classification}</span>
              {book.classification_code && (
                <span className="ml-1 chip bg-riso-yellow/25">{book.classification_code}</span>
              )}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {(book.tags ?? []).map((t) => {
              const p = palette(t.color);
              return (
                <Link
                  key={t.id}
                  href={`/library?tag=${t.id}`}
                  className={cn("chip", p.chip)}
                >
                  <span className={cn("h-2 w-2 rounded-full", p.dot)} /> {t.name}
                </Link>
              );
            })}
            {(book.tags ?? []).length === 0 && !book.classification && (
              <p className="text-sm text-text-muted">
                No classification yet —{" "}
                <button onClick={() => openEditBook(book)} className="font-bold text-riso-blue">
                  add some
                </button>
                .
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Description */}
      {book.description && (
        <section className="card p-5">
          <h2 className="mb-2 font-display text-lg font-extrabold">About</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-text-muted">
            {book.description}
          </p>
        </section>
      )}

      {/* Lending */}
      <LoanSection book={book} />

      {/* Who recommended it / who you told */}
      <RecommendationsSection bookId={book.id} />

      {/* Other editions (linked, or ones that look like the same work) */}
      <EditionsSection book={book} />

        </div>
      )}

      {tab === "history" && (
        <div className="space-y-6">
          <ReadingHistory book={book} sessions={sessions} mode="sessions" />
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <>
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </>
  );
}
