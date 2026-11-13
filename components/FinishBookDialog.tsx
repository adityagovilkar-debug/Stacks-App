"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Heart, Dice5, BookOpen, PartyPopper } from "lucide-react";
import { Dialog } from "./Dialog";
import { BookCover } from "./BookCover";
import { RatingStars } from "./RatingStars";
import { useBooks, usePatchBook, useSetReadStatus } from "@/lib/queries";
import { todayISO } from "@/lib/stats";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";

// One sheet for finishing a book: when, how good, a line about it, favourite —
// then straight on to what you'll read next.
export function FinishBookDialog({
  open,
  book,
  onClose,
}: {
  open: boolean;
  book?: Book;
  onClose: () => void;
}) {
  // Remount the form per book so its fields start fresh.
  if (!open || !book) return null;
  return <FinishForm key={book.id} book={book} onClose={onClose} />;
}

function FinishForm({ book, onClose }: { book: Book; onClose: () => void }) {
  const setStatus = useSetReadStatus();
  const patch = usePatchBook();
  const { data: books = [] } = useBooks();

  const firstRead = book.times_read < 1;
  const [step, setStep] = useState<"form" | "next">("form");
  const [finishedOn, setFinishedOn] = useState(todayISO());
  const [unknownDate, setUnknownDate] = useState(false);
  const [rating, setRating] = useState<number | null>(firstRead ? book.rating : null);
  const [review, setReview] = useState(firstRead ? (book.review ?? "") : "");
  const [favorite, setFavorite] = useState(book.favorite);

  const upNext = useMemo(
    () =>
      books
        .filter((b) => b.queue_position != null && b.id !== book.id)
        .sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0))[0] ?? null,
    [books, book.id],
  );

  async function save() {
    try {
      await setStatus.mutateAsync({
        book,
        status: "read",
        finishedOn: unknownDate ? null : finishedOn,
        rating,
        review: review.trim() || null,
      });
      if (favorite !== book.favorite)
        await patch.mutateAsync({ id: book.id, patch: { favorite } });
      setStep("next");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    }
  }

  function startNext(b: Book) {
    patch.mutate(
      {
        id: b.id,
        patch: { read_status: "reading", queue_position: null, started_on: b.started_on ?? todayISO() },
      },
      { onSuccess: () => toast.success(`Started “${b.title}” 📖`) },
    );
    onClose();
  }

  if (step === "next")
    return (
      <Dialog open onClose={onClose} title="Finished!">
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-[2.5px] border-outline bg-riso-yellow pop-sm">
            <PartyPopper className="h-7 w-7 text-[#1a1430]" />
          </div>
          <p className="font-display text-lg font-extrabold">
            “{book.title}” is on the read pile.
          </p>
          <div className="space-y-2 text-left">
            <p className="text-xs font-bold uppercase tracking-wide text-text-muted">What next?</p>
            {upNext ? (
              <div className="card-soft flex items-center gap-3 p-3">
                <div className="w-10 shrink-0">
                  <BookCover title={upNext.title} authors={upNext.authors} coverUrl={upNext.cover_url} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-text-muted">Top of your queue</p>
                  <p className="line-clamp-2 font-display text-sm font-bold">{upNext.title}</p>
                </div>
                <button className="btn-primary shrink-0" onClick={() => startNext(upNext)}>
                  <BookOpen className="h-4 w-4" /> Start
                </button>
              </div>
            ) : (
              <p className="text-sm text-text-muted">Your queue is empty.</p>
            )}
            <div className="flex gap-2">
              <Link href="/next" onClick={onClose} className="btn-outline flex-1">
                <Dice5 className="h-5 w-5" /> Surprise me
              </Link>
              <button className="btn-ghost flex-1" onClick={onClose}>
                Not now
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    );

  return (
    <Dialog
      open
      onClose={onClose}
      title={firstRead ? "Finished it?" : "Finished your re-read?"}
      footer={
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={setStatus.isPending}>
            {setStatus.isPending ? "Saving…" : "Mark as read"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 shrink-0">
            <BookCover title={book.title} authors={book.authors} coverUrl={book.cover_url} />
          </div>
          <p className="line-clamp-2 font-display font-extrabold leading-tight">{book.title}</p>
        </div>

        <div>
          <label className="label">Finished on</label>
          <input
            className="input"
            type="date"
            max={todayISO()}
            value={finishedOn}
            disabled={unknownDate}
            onChange={(e) => setFinishedOn(e.target.value)}
          />
          <label className="mt-2 flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className="h-4 w-4 accent-riso-blue"
              checked={unknownDate}
              onChange={(e) => setUnknownDate(e.target.checked)}
            />
            I don&apos;t remember when
          </label>
        </div>

        <div>
          <label className="label">{firstRead ? "Your rating" : "Rating for this read"}</label>
          <RatingStars value={rating} onChange={setRating} size={30} />
        </div>

        <div>
          <label className="label">A line about it (optional)</label>
          <textarea
            className="textarea"
            rows={2}
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder={firstRead ? "What stayed with you?" : "How was it this time?"}
          />
        </div>

        <button
          type="button"
          onClick={() => setFavorite((f) => !f)}
          className={cn("chip", favorite ? "bg-riso-pink/15" : "opacity-70")}
        >
          <Heart className={cn("h-3.5 w-3.5", favorite && "fill-riso-pink text-riso-pink")} />
          {favorite ? "A favourite" : "Add to favourites"}
        </button>
      </div>
    </Dialog>
  );
}
