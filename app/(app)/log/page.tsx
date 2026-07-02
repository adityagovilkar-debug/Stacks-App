"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Flame, BookOpen, NotebookPen, Trash2 } from "lucide-react";
import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { useSessions, useDeleteSession } from "@/lib/queries";
import { openLogSession } from "@/lib/events";
import { currentStreak, totalPages } from "@/lib/stats";
import { format, parseISO, isToday, isYesterday } from "date-fns";

function dayLabel(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, d MMMM yyyy");
}

export default function LogPage() {
  const { data: sessions = [], isLoading } = useSessions();
  const del = useDeleteSession();

  const streak = useMemo(() => currentStreak(sessions), [sessions]);
  const grouped = useMemo(() => {
    const map = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const arr = map.get(s.happened_on) ?? [];
      arr.push(s);
      map.set(s.happened_on, arr);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [sessions]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold misreg">Reading log</h1>
          <p className="mt-1 text-text-muted">Every session, newest first.</p>
        </div>
        <button onClick={() => openLogSession()} className="btn-primary">
          <BookOpen className="h-5 w-5" /> Log reading
        </button>
      </header>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={<Flame className="h-5 w-5 text-riso-orange" />} value={`${streak}`} label="day streak" />
        <Stat value={`${totalPages(sessions)}`} label="pages logged" />
        <Stat value={`${sessions.length}`} label="sessions" />
      </div>

      {isLoading ? (
        <SkeletonList rows={5} />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No sessions logged yet"
          hint="Log what you read each day to build your streak and track your speed."
          action={
            <button onClick={() => openLogSession()} className="btn-primary">
              <BookOpen className="h-5 w-5" /> Log your first session
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, items]) => {
            const dayPages = items.reduce((n, s) => n + s.pages_read, 0);
            const dayAudioMin = items
              .filter((s) => s.book?.format === "audiobook")
              .reduce((n, s) => n + (s.minutes || 0), 0);
            return (
            <div key={day}>
              <h2 className="mb-2 font-display text-sm font-extrabold uppercase tracking-wide text-text-muted">
                {dayLabel(day)} ·{" "}
                <span className="text-riso-blue">
                  {[
                    dayPages > 0 ? `${dayPages} pages` : null,
                    dayAudioMin > 0 ? `${dayAudioMin} min listened` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "0 pages"}
                </span>
              </h2>
              <ul className="space-y-2">
                {items.map((s) => (
                  <li key={s.id} className="card-soft flex items-center gap-3 p-3">
                    <Link href={`/book/${s.book_id}`} className="w-9 shrink-0">
                      <BookCover
                        title={s.book?.title ?? "Book"}
                        coverUrl={s.book?.cover_url}
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/book/${s.book_id}`}
                        className="truncate font-display text-sm font-bold hover:underline"
                      >
                        {s.book?.title ?? "Book"}
                      </Link>
                      <p className="text-xs text-text-muted">
                        {s.book?.format === "audiobook"
                          ? `🎧 ${s.minutes ?? 0} min listened`
                          : `${s.pages_read} pages${s.minutes ? ` · ${s.minutes} min` : ""}${
                              s.minutes && s.pages_read
                                ? ` · ~${Math.round((s.pages_read / s.minutes) * 60)} pp/hr`
                                : ""
                            }`}
                      </p>
                      {s.note && (
                        <p className="mt-0.5 truncate text-xs italic text-text-muted">
                          “{s.note}”
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => del.mutate(s.id)}
                      aria-label="Delete"
                      className="rounded-lg p-1.5 text-text-muted hover:bg-surface-2 hover:text-riso-pink"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon?: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="card flex flex-col items-center justify-center p-3 text-center">
      <div className="flex items-center gap-1.5 font-display text-2xl font-extrabold">
        {icon} {value}
      </div>
      <div className="text-xs font-semibold text-text-muted">{label}</div>
    </div>
  );
}
