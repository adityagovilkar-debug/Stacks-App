"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquareHeart } from "lucide-react";
import { BookCover } from "@/components/BookCover";
import { StatusStamp } from "@/components/StatusStamp";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { useBooks, useRecommendations } from "@/lib/queries";
import type { Book, RecDirection, Recommendation } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

// The recommendations ledger: what friends told you to read (and whether you
// have yet), and what you've passed on to whom.
export default function RecommendationsPage() {
  const { data: recs = [], isLoading } = useRecommendations();
  const { data: books = [] } = useBooks();
  const [tab, setTab] = useState<RecDirection>("from");
  const byId = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);

  const groups = useMemo(() => {
    const map = new Map<string, { person: string; items: Recommendation[] }>();
    for (const r of recs) {
      if (r.direction !== tab) continue;
      const k = r.person.trim().toLowerCase();
      const g = map.get(k) ?? { person: r.person.trim(), items: [] };
      g.items.push(r);
      map.set(k, g);
    }
    return [...map.values()].sort((a, b) => b.items.length - a.items.length || a.person.localeCompare(b.person));
  }, [recs, tab]);

  const fromCount = recs.filter((r) => r.direction === "from").length;
  const toCount = recs.length - fromCount;
  const waiting = recs.filter((r) => {
    const b = byId.get(r.book_id);
    return r.direction === "from" && b && b.times_read < 1 && b.read_status !== "read";
  }).length;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-extrabold misreg">Recommendations</h1>
        <p className="mt-1 text-text-muted">
          Who put a book in your hands, and who you&apos;ve passed books on to.
          {waiting > 0 ? ` ${waiting} recommended to you are still unread.` : ""}
        </p>
      </header>

      <div className="inline-flex rounded-xl border-2 border-outline bg-surface-2 p-1">
        {(
          [
            ["from", `To you · ${fromCount}`],
            ["to", `From you · ${toCount}`],
          ] as const
        ).map(([d, label]) => (
          <button
            key={d}
            onClick={() => setTab(d)}
            className={cn(
              "rounded-lg px-4 py-2 font-bold transition",
              tab === d ? "bg-riso-blue text-white" : "text-text-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={MessageSquareHeart}
          title={tab === "from" ? "Nothing recommended to you yet" : "You haven't passed anything on yet"}
          hint={
            tab === "from"
              ? "On a book's page, add who recommended it under Recommendations."
              : "Share books from the library (Select → Share) and say who they're for, or add it on a book's page."
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.person} className="card p-4">
              <h2 className="mb-2 font-display text-lg font-extrabold">
                {tab === "from" ? `From ${g.person}` : `To ${g.person}`}
                <span className="ml-2 chip bg-surface-2">{g.items.length}</span>
              </h2>
              <ul className="space-y-2">
                {g.items.map((r) => {
                  const b: Book | undefined = byId.get(r.book_id);
                  return (
                    <li key={r.id} className="flex items-center gap-3">
                      <Link href={`/book/${r.book_id}`} className="w-8 shrink-0">
                        <BookCover title={r.book?.title ?? "Book"} authors={r.book?.authors} coverUrl={r.book?.cover_url} />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/book/${r.book_id}`} className="block truncate text-sm font-bold hover:underline">
                          {r.book?.title ?? "Removed book"}
                        </Link>
                        <p className="text-xs text-text-muted">
                          {format(parseISO(r.on_date), "d MMM yyyy")}
                          {r.channel ? ` · ${r.channel}` : ""}
                        </p>
                      </div>
                      {b && <StatusStamp status={b.read_status} timesRead={b.times_read} />}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
