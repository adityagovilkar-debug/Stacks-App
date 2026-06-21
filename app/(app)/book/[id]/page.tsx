"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { BookCover } from "@/components/BookCover";
import { StatusStamp } from "@/components/StatusStamp";
import { RatingStars } from "@/components/RatingStars";
import { ProgressBar } from "@/components/ProgressBar";
import { SkeletonList } from "@/components/Skeleton";
import {
  useBook,
  useBookSessions,
  useDeleteBook,
  useDeleteSession,
  useLocations,
  usePatchBook,
  useReadAgain,
  useSetReadStatus,
  useAddToQueue,
  useRemoveFromQueue,
} from "@/lib/queries";
import { buildPathMap } from "@/lib/locations";
import { openEditBook, openLogSession } from "@/lib/events";
import { readingProgress } from "@/lib/stats";
import {
  FORMAT_LABEL,
  OWNERSHIP_LABEL,
  READ_STATUS_LABEL,
  palette,
  type ReadStatus,
} from "@/lib/types";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export default function BookDetailPage() {
  const router = useRouter();
  const id = useParams().id as string;
  const { data: book, isLoading } = useBook(id);
  const { data: sessions = [] } = useBookSessions(id);
  const { data: locations = [] } = useLocations();

  const setStatus = useSetReadStatus();
  const readAgain = useReadAgain();
  const patch = usePatchBook();
  const del = useDeleteBook();
  const addQ = useAddToQueue();
  const removeQ = useRemoveFromQueue();
  const delSession = useDeleteSession();

  const [bookmark, setBookmark] = useState("");
  const [review, setReview] = useState("");

  useEffect(() => {
    if (book) {
      setBookmark(book.current_page != null ? String(book.current_page) : "");
      setReview(book.review ?? "");
    }
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
  const locPath = book.location_id
    ? buildPathMap(locations).get(book.location_id)
    : null;

  function saveBookmark() {
    const p = bookmark.trim() === "" ? null : Number(bookmark);
    patch.mutate({ id: book!.id, patch: { current_page: p } });
    toast.success("Bookmark updated");
  }
  function saveReview() {
    patch.mutate({ id: book!.id, patch: { review: review.trim() || null } });
    toast.success("Review saved");
  }
  function remove() {
    if (!confirm(`Delete “${book!.title}” from your library?`)) return;
    del.mutate(book!.id, {
      onSuccess: () => {
        toast.success("Deleted");
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

      {/* Hero */}
      <div className="flex flex-col gap-5 sm:flex-row">
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
                {book.authors.join(", ")}
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
            <StatusStamp status={book.read_status} timesRead={book.times_read} />
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

          {/* Status controls */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(READ_STATUS_LABEL) as ReadStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus.mutate({ book, status: s })}
                className={cn(
                  "chip",
                  book.read_status === s ? "bg-riso-blue text-white" : "",
                )}
              >
                {READ_STATUS_LABEL[s]}
              </button>
            ))}
            {book.read_status === "read" && (
              <button onClick={() => readAgain.mutate(book)} className="chip border-dashed">
                <RotateCcw className="h-3.5 w-3.5" /> Read again
              </button>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => openLogSession(book)}
              className="btn-primary"
            >
              <BookOpen className="h-5 w-5" /> Log reading
            </button>
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
              <Trash2 className="h-5 w-5" /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Bookmark */}
      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold">
          <Bookmark className="h-5 w-5 text-riso-orange" /> Where you left off
        </h2>
        {progress != null && (
          <div className="mb-3">
            <ProgressBar percent={progress} color="var(--color-riso-orange)" />
            <p className="mt-1.5 text-sm font-semibold text-text-muted">
              Page {book.current_page} of {book.page_count} · {progress}%
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="label">Current page</label>
            <input
              className="input w-32"
              type="number"
              inputMode="numeric"
              value={bookmark}
              onChange={(e) => setBookmark(e.target.value)}
              placeholder={book.page_count ? `of ${book.page_count}` : "page"}
            />
          </div>
          <button className="btn-outline" onClick={saveBookmark}>
            Update bookmark
          </button>
        </div>
      </section>

      {/* Metadata + classification */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-display text-lg font-extrabold">Details</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Meta label="Publisher" value={book.publisher} />
            <Meta label="Published" value={book.published_year?.toString()} />
            <Meta label="Pages" value={book.page_count?.toString()} />
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

      {/* Reading sessions */}
      <section className="card p-5">
        <h2 className="mb-3 font-display text-lg font-extrabold">Reading history</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-text-muted">
            No sessions yet. Hit “Log reading” to start tracking your progress.
          </p>
        ) : (
          <ul className="divide-y-2 divide-border">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1">
                  <p className="text-sm font-bold">
                    {format(parseISO(s.happened_on), "EEE, d MMM yyyy")}
                  </p>
                  <p className="text-xs text-text-muted">
                    {s.pages_read} pages
                    {s.minutes ? ` · ${s.minutes} min` : ""}
                    {s.minutes && s.pages_read
                      ? ` · ~${Math.round((s.pages_read / s.minutes) * 60)} pp/hr`
                      : ""}
                    {s.note ? ` · “${s.note}”` : ""}
                  </p>
                </div>
                <button
                  onClick={() => delSession.mutate(s.id)}
                  aria-label="Delete session"
                  className="rounded-lg p-1.5 text-text-muted hover:bg-surface-2 hover:text-riso-pink"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-text-muted">
          <Clock className="h-3.5 w-3.5" />
          {sessions.reduce((n, s) => n + s.pages_read, 0)} pages logged across{" "}
          {sessions.length} sessions
        </p>
      </section>
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
