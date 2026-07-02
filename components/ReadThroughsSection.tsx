"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Repeat, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { RatingStars } from "./RatingStars";
import {
  useReadThroughs,
  useAddReadThrough,
  useUpdateReadThrough,
  useDeleteReadThrough,
} from "@/lib/queries";
import { todayISO } from "@/lib/stats";
import { format, parseISO } from "date-fns";
import type { ReadThrough } from "@/lib/types";

// Per-read-through history: each completed read keeps its own dated rating +
// review, so a re-read never overwrites what past-you thought.
export function ReadThroughsSection({ bookId }: { bookId: string }) {
  const { data: reads = [] } = useReadThroughs(bookId);
  const add = useAddReadThrough();
  const del = useDeleteReadThrough();

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function addRead(patch: { finished_on: string | null; rating: number | null; review: string | null }) {
    await add.mutateAsync({ book_id: bookId, started_on: null, ...patch });
    setAdding(false);
    toast.success("Read added");
  }

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
          <Repeat className="h-5 w-5 text-riso-blue" /> Your reads
          {reads.length > 1 ? (
            <span className="chip bg-surface-2">{reads.length}×</span>
          ) : null}
        </h2>
        {!adding && (
          <button className="chip" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" /> Add a read
          </button>
        )}
      </div>

      {adding && (
        <ReadEditor
          initial={{ finished_on: todayISO(), rating: null, review: null }}
          onCancel={() => setAdding(false)}
          onSave={addRead}
          pending={add.isPending}
        />
      )}

      {reads.length === 0 && !adding ? (
        <p className="text-sm text-text-muted">
          No reads recorded yet. Mark the book read, or add a past read.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {reads.map((r, i) =>
            editingId === r.id ? (
              <li key={r.id}>
                <EditRow read={r} onDone={() => setEditingId(null)} />
              </li>
            ) : (
              <li
                key={r.id}
                className="rounded-xl border-2 border-outline bg-surface-2 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      {reads.length > 1 ? `Read #${reads.length - i} · ` : ""}
                      {r.finished_on
                        ? format(parseISO(r.finished_on), "d MMM yyyy")
                        : "date unknown"}
                    </p>
                    {r.rating != null && r.rating > 0 && (
                      <div className="mt-1">
                        <RatingStars value={r.rating} size={14} />
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => setEditingId(r.id)}
                      aria-label="Edit read"
                      className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-riso-blue"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this read from the history?"))
                          del.mutate({ id: r.id, book_id: bookId });
                      }}
                      aria-label="Delete read"
                      className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-riso-pink"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {r.review && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text-muted">
                    {r.review}
                  </p>
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}

function EditRow({ read, onDone }: { read: ReadThrough; onDone: () => void }) {
  const update = useUpdateReadThrough();
  return (
    <ReadEditor
      initial={{
        finished_on: read.finished_on,
        rating: read.rating,
        review: read.review,
      }}
      onCancel={onDone}
      pending={update.isPending}
      onSave={async (patch) => {
        await update.mutateAsync({ id: read.id, book_id: read.book_id, patch });
        onDone();
      }}
    />
  );
}

function ReadEditor({
  initial,
  onSave,
  onCancel,
  pending,
}: {
  initial: { finished_on: string | null; rating: number | null; review: string | null };
  onSave: (patch: { finished_on: string | null; rating: number | null; review: string | null }) => void;
  onCancel: () => void;
  pending?: boolean;
}) {
  const [finishedOn, setFinishedOn] = useState(initial.finished_on ?? "");
  const [rating, setRating] = useState<number | null>(initial.rating);
  const [review, setReview] = useState(initial.review ?? "");

  return (
    <div className="space-y-3 rounded-xl border-2 border-outline bg-surface-2 p-3">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="label">Finished on</label>
          <input
            className="input w-44"
            type="date"
            value={finishedOn}
            max={todayISO()}
            onChange={(e) => setFinishedOn(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Rating</label>
          <RatingStars value={rating} onChange={setRating} />
        </div>
      </div>
      <div>
        <label className="label">Review for this read</label>
        <textarea
          className="textarea"
          rows={3}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="What did you make of it this time?"
        />
      </div>
      <div className="flex gap-2">
        <button
          className="btn-primary"
          disabled={pending}
          onClick={() =>
            onSave({
              finished_on: finishedOn || null,
              rating,
              review: review.trim() || null,
            })
          }
        >
          <Check className="h-4 w-4" /> Save
        </button>
        <button className="btn-ghost" onClick={onCancel}>
          <X className="h-4 w-4" /> Cancel
        </button>
      </div>
    </div>
  );
}
