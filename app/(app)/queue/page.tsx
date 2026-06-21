"use client";

import { useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, Play, X, ListChecks } from "lucide-react";
import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import {
  useBooks,
  usePatchBook,
  useRemoveFromQueue,
  useReorderQueue,
} from "@/lib/queries";
import { todayISO } from "@/lib/stats";

export default function QueuePage() {
  const { data: books = [], isLoading } = useBooks();
  const reorder = useReorderQueue();
  const removeQ = useRemoveFromQueue();
  const patch = usePatchBook();

  const queue = useMemo(
    () =>
      books
        .filter((b) => b.queue_position != null)
        .sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0)),
    [books],
  );

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= queue.length) return;
    const ids = queue.map((b) => b.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    reorder.mutate(ids);
  }

  function startReading(id: string, started_on: string | null) {
    patch.mutate({
      id,
      patch: {
        read_status: "reading",
        queue_position: null,
        started_on: started_on ?? todayISO(),
      },
    });
    toast.success("Happy reading! 📖");
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-extrabold misreg">Up next</h1>
        <p className="mt-1 text-text-muted">
          Your to-read queue, in the order you&apos;ll tackle them.
        </p>
      </header>

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : queue.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nothing queued yet"
          hint="Browse your library and tap “Add to queue” on books you want to read next."
          action={
            <Link href="/library" className="btn-primary">
              Browse library
            </Link>
          }
        />
      ) : (
        <ol className="space-y-3">
          {queue.map((b, i) => (
            <li key={b.id} className="card flex items-center gap-3 p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-outline bg-riso-yellow font-display text-sm font-extrabold text-[#1a1430]">
                {i + 1}
              </span>
              <Link href={`/book/${b.id}`} className="w-10 shrink-0">
                <BookCover title={b.title} authors={b.authors} coverUrl={b.cover_url} />
              </Link>
              <Link href={`/book/${b.id}`} className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold">{b.title}</p>
                <p className="truncate text-xs text-text-muted">
                  {b.authors.join(", ")}
                  {b.page_count ? ` · ${b.page_count} pp` : ""}
                </p>
              </Link>

              <div className="flex shrink-0 items-center gap-1">
                <div className="flex flex-col">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    className="rounded p-0.5 text-text-muted hover:bg-surface-2 disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === queue.length - 1}
                    aria-label="Move down"
                    className="rounded p-0.5 text-text-muted hover:bg-surface-2 disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => startReading(b.id, b.started_on)}
                  aria-label="Start reading"
                  className="rounded-lg border-2 border-outline bg-riso-blue p-2 text-white pop-sm"
                >
                  <Play className="h-4 w-4" />
                </button>
                <button
                  onClick={() => removeQ.mutate(b.id)}
                  aria-label="Remove from queue"
                  className="rounded-lg p-2 text-text-muted hover:bg-surface-2 hover:text-riso-pink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
