"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dice5, BookOpen, RotateCcw, Sparkles } from "lucide-react";
import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { useBooks, useTags, usePatchBook } from "@/lib/queries";
import { todayISO } from "@/lib/stats";
import { palette, type Book } from "@/lib/types";
import { cn } from "@/lib/utils";

type Pool = "queue" | "unread";

export default function ReadNextPage() {
  const router = useRouter();
  const { data: books = [] } = useBooks();
  const { data: tags = [] } = useTags();
  const patch = usePatchBook();

  const moods = useMemo(() => tags.filter((t) => t.kind === "mood"), [tags]);
  const hasQueue = books.some((b) => b.queue_position != null);

  const [pool, setPool] = useState<Pool>(hasQueue ? "queue" : "unread");
  const [moodIds, setMoodIds] = useState<Set<string>>(new Set());
  const [pick, setPick] = useState<Book | null>(null);

  const candidates = useMemo(() => {
    return books.filter((b) => {
      if (pool === "queue" ? b.queue_position == null : b.read_status !== "unread")
        return false;
      if (moodIds.size) {
        const have = new Set((b.tags ?? []).map((t) => t.id));
        let ok = false;
        for (const id of moodIds) if (have.has(id)) ok = true;
        if (!ok) return false;
      }
      return true;
    });
  }, [books, pool, moodIds]);

  function roll() {
    if (!candidates.length) {
      setPick(null);
      toast("Nothing matches — widen the net.");
      return;
    }
    // Avoid landing on the same book twice in a row when there's a choice.
    let next = candidates[Math.floor(Math.random() * candidates.length)];
    if (candidates.length > 1 && pick) {
      let guard = 0;
      while (next.id === pick.id && guard++ < 8)
        next = candidates[Math.floor(Math.random() * candidates.length)];
    }
    setPick(next);
  }

  function startReading(b: Book) {
    patch.mutate(
      {
        id: b.id,
        patch: {
          read_status: "reading",
          queue_position: null,
          started_on: b.started_on ?? todayISO(),
        },
      },
      {
        onSuccess: () => {
          toast.success("Happy reading! 📖");
          router.push(`/book/${b.id}`);
        },
      },
    );
  }

  function toggleMood(id: string) {
    setMoodIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    setPick(null);
  }

  const empty = books.length === 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold misreg">What next?</h1>
        <p className="mt-1 text-text-muted">
          Can&apos;t decide? Let Stacks pick your next read.
        </p>
      </header>

      {empty ? (
        <EmptyState
          icon={Sparkles}
          title="Add some books first"
          hint="Once you have unread books or a queue, the picker can surprise you."
          action={
            <Link href="/add" className="btn-primary">
              Add a book
            </Link>
          }
        />
      ) : (
        <>
          {/* Controls */}
          <div className="card-soft space-y-4 p-4">
            <div>
              <div className="label">Pick from</div>
              <div className="inline-flex rounded-xl border-2 border-outline bg-surface-2 p-1">
                {(
                  [
                    { key: "queue", label: "My queue" },
                    { key: "unread", label: "Anything unread" },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      setPool(p.key);
                      setPick(null);
                    }}
                    className={cn(
                      "rounded-lg px-4 py-2 font-bold transition",
                      pool === p.key ? "bg-riso-blue text-white" : "text-text-muted",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {moods.length > 0 && (
              <div>
                <div className="label">In the mood for (optional)</div>
                <div className="flex flex-wrap gap-1.5">
                  {moods.map((t) => {
                    const on = moodIds.has(t.id);
                    const p = palette(t.color);
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleMood(t.id)}
                        className={cn("chip transition", on ? p.chip : "opacity-60 hover:opacity-100")}
                      >
                        <span className={cn("h-2 w-2 rounded-full", p.dot)} /> {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-sm text-text-muted">
              {candidates.length} book{candidates.length === 1 ? "" : "s"} in the hat.
            </p>

            <button className="btn-primary w-full" onClick={roll} disabled={!candidates.length}>
              <Dice5 className="h-5 w-5" /> {pick ? "Roll again" : "Surprise me"}
            </button>
          </div>

          {/* The pick */}
          {pick && (
            <div className="card flex flex-col gap-5 p-5 sm:flex-row">
              <Link href={`/book/${pick.id}`} className="mx-auto w-40 shrink-0 sm:mx-0">
                <BookCover
                  title={pick.title}
                  authors={pick.authors}
                  coverUrl={pick.cover_url}
                  className="pop"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-riso-pink">
                  Your next read
                </p>
                <h2 className="mt-1 font-display text-2xl font-extrabold leading-tight">
                  {pick.title}
                </h2>
                {pick.authors?.length > 0 && (
                  <p className="mt-1 font-semibold">{pick.authors.join(", ")}</p>
                )}
                {pick.description && (
                  <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-text-muted">
                    {pick.description}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn-primary" onClick={() => startReading(pick)}>
                    <BookOpen className="h-5 w-5" /> Start reading
                  </button>
                  <button className="btn-outline" onClick={roll}>
                    <RotateCcw className="h-5 w-5" /> Roll again
                  </button>
                  <Link href={`/book/${pick.id}`} className="btn-ghost">
                    View details
                  </Link>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
