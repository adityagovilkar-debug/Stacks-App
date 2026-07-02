"use client";

import { heatmap } from "@/lib/stats";
import type { ReadingSession } from "@/lib/types";
import { format, parseISO } from "date-fns";

// GitHub-style contribution grid of pages read per day over the last ~26 weeks.
export function StreakHeatmap({ sessions }: { sessions: ReadingSession[] }) {
  const cols = heatmap(sessions, 26);

  // Color intensity by pages read that day; audio-only days fall back to a
  // rough page-equivalent (~2 min per page) so they still light up.
  const level = (pages: number, minutes: number) => {
    const eq = pages > 0 ? pages : Math.round(minutes / 2);
    if (eq === 0) return "bg-surface-2";
    if (eq < 15) return "bg-riso-blue/30";
    if (eq < 35) return "bg-riso-blue/55";
    if (eq < 60) return "bg-riso-blue/80";
    return "bg-riso-blue";
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((cell) => (
              <div
                key={cell.date}
                title={`${format(parseISO(cell.date), "d MMM yyyy")}: ${
                  cell.pages > 0
                    ? `${cell.pages} pages`
                    : cell.minutes > 0
                      ? `${cell.minutes} min`
                      : "nothing logged"
                }`}
                className={`h-3 w-3 rounded-[3px] border border-outline/30 ${level(cell.pages, cell.minutes)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
        Less
        <span className="h-3 w-3 rounded-[3px] border border-outline/30 bg-surface-2" />
        <span className="h-3 w-3 rounded-[3px] bg-riso-blue/30" />
        <span className="h-3 w-3 rounded-[3px] bg-riso-blue/55" />
        <span className="h-3 w-3 rounded-[3px] bg-riso-blue/80" />
        <span className="h-3 w-3 rounded-[3px] bg-riso-blue" />
        More
      </div>
    </div>
  );
}
