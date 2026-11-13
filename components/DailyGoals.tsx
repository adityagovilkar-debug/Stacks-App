"use client";

import Link from "next/link";
import { ProgressBar } from "./ProgressBar";
import { minutesOn, monthGoalDays, pagesOn, todayISO } from "@/lib/stats";
import type { ReadingSession } from "@/lib/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Both daily goals side by side, plus this month's calendar of goal days.
// A day counts if either goal is met.
export function DailyGoals({
  sessions,
  goalPages,
  goalMinutes,
  restDays,
}: {
  sessions: ReadingSession[];
  goalPages: number;
  goalMinutes: number;
  restDays: number;
}) {
  const today = todayISO();
  const pages = pagesOn(today, sessions);
  const mins = minutesOn(today, sessions);
  const days = monthGoalDays(sessions, goalPages, goalMinutes);
  const soFar = days.filter((d) => !d.future);
  const hit = soFar.filter((d) => d.hit).length;
  // Monday-first offset for the first day of the month.
  const lead = (new Date(days[0].date + "T00:00").getDay() + 6) % 7;

  return (
    <section className="card p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-extrabold">Daily goals</h2>
        <Link href="/settings" className="text-xs font-bold text-riso-blue hover:underline">
          Change goals
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex justify-between text-sm font-bold">
            <span>Pages today</span>
            <span className="text-text-muted">
              {pages}/{goalPages}
            </span>
          </div>
          <ProgressBar percent={(pages / Math.max(1, goalPages)) * 100} />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-sm font-bold">
            <span>Minutes today</span>
            <span className="text-text-muted">
              {mins}/{goalMinutes}
            </span>
          </div>
          <ProgressBar
            percent={(mins / Math.max(1, goalMinutes)) * 100}
            color="var(--color-riso-purple)"
          />
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-bold">
          {format(new Date(), "MMMM")}: goal hit on{" "}
          <span className="text-riso-blue">
            {hit} of {soFar.length} day{soFar.length === 1 ? "" : "s"}
          </span>
        </p>
        <div className="grid max-w-xs grid-cols-7 gap-1.5 text-center text-[0.65rem] font-bold">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span key={i} className="text-text-muted">
              {d}
            </span>
          ))}
          {Array.from({ length: lead }).map((_, i) => (
            <span key={"l" + i} />
          ))}
          {days.map((d) => (
            <span
              key={d.date}
              title={d.hit ? "Goal hit" : d.read ? "Read, goal not hit" : d.future ? "" : "No reading"}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md border-2",
                d.hit
                  ? "border-outline bg-riso-blue text-white"
                  : d.read
                    ? "border-outline bg-riso-blue/25"
                    : d.future
                      ? "border-transparent text-text-muted/50"
                      : "border-border bg-surface-2 text-text-muted",
                d.date === today && "ring-2 ring-riso-pink ring-offset-1 ring-offset-surface",
              )}
            >
              {d.day}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Solid = goal hit · pale = read a little ·{" "}
          {restDays > 0
            ? `${restDays} rest day${restDays === 1 ? "" : "s"} a week won't break your streak.`
            : "no rest days set (Settings → Reading goals)."}
        </p>
      </div>
    </section>
  );
}
