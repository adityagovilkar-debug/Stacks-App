"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MessageSquareHeart, Trash2 } from "lucide-react";
import {
  useAddRecommendations,
  useBookRecommendations,
  useDeleteRecommendation,
} from "@/lib/queries";
import { todayISO } from "@/lib/stats";
import { format, parseISO } from "date-fns";
import type { RecDirection } from "@/lib/types";
import { cn } from "@/lib/utils";

// Who told you about this book, and who you've passed it on to.
export function RecommendationsSection({ bookId }: { bookId: string }) {
  const { data: recs = [] } = useBookRecommendations(bookId);
  const add = useAddRecommendations();
  const del = useDeleteRecommendation();
  const [direction, setDirection] = useState<RecDirection>("from");
  const [person, setPerson] = useState("");

  const from = recs.filter((r) => r.direction === "from");
  const to = recs.filter((r) => r.direction === "to");

  async function save() {
    const p = person.trim();
    if (!p) return;
    try {
      await add.mutateAsync([
        { book_id: bookId, person: p, direction, on_date: todayISO(), channel: direction === "to" ? "in person" : null },
      ]);
      setPerson("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    }
  }

  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold">
        <MessageSquareHeart className="h-5 w-5 text-riso-pink" /> Recommendations
      </h2>

      {from.length > 0 && (
        <p className="mb-2 text-sm">
          <span className="text-text-muted">Recommended to you by </span>
          {from.map((r, i) => (
            <span key={r.id} className="inline-flex items-center gap-1">
              <b>{r.person}</b>
              <button
                aria-label={`Remove ${r.person}`}
                className="text-text-muted hover:text-riso-pink"
                onClick={() => del.mutate(r.id)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
              {i < from.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      )}

      {to.length > 0 && (
        <ul className="mb-3 space-y-1 text-sm">
          {to.map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <span className="text-text-muted">
                You recommended it to <b className="text-text">{r.person}</b> ·{" "}
                {format(parseISO(r.on_date), "d MMM yyyy")}
                {r.channel ? ` · ${r.channel}` : ""}
              </span>
              <button
                aria-label="Remove"
                className="ml-auto rounded p-1 text-text-muted hover:text-riso-pink"
                onClick={() => del.mutate(r.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="inline-flex rounded-xl border-2 border-outline bg-surface-2 p-1">
          {(
            [
              ["from", "Recommended by"],
              ["to", "I told"],
            ] as const
          ).map(([d, label]) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-bold transition",
                direction === d ? "bg-riso-blue text-white" : "text-text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          className="input min-w-0 flex-1"
          value={person}
          onChange={(e) => setPerson(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Who?"
        />
        <button className="btn-outline" onClick={save} disabled={!person.trim() || add.isPending}>
          Add
        </button>
      </div>
      {recs.length === 0 && (
        <p className="mt-2 text-xs text-text-muted">
          Books you share from the library (Select → Share) are logged here too.
        </p>
      )}
    </section>
  );
}
