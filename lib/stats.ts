// Pure helpers for the reading-habit analytics: streaks, pages/minutes over
// time, reading speed, and breakdowns. All operate on plain arrays so they're
// trivial to test and reuse across the dashboard + stats page.

import {
  format,
  parseISO,
  subDays,
  startOfWeek,
  startOfMonth,
  differenceInCalendarDays,
} from "date-fns";
import type { Book, ReadingSession } from "./types";
import { uniqueAuthors } from "./utils";

export const ISO = (d: Date) => format(d, "yyyy-MM-dd");
export const todayISO = () => ISO(new Date());

// --- Streaks ---------------------------------------------------------------
export function readDays(sessions: ReadingSession[]): Set<string> {
  return new Set(sessions.map((s) => s.happened_on));
}

// Consecutive days (ending today, or yesterday if you haven't logged today
// yet) on which at least one session exists.
export function currentStreak(sessions: ReadingSession[], today = new Date()): number {
  const days = readDays(sessions);
  let cursor = today;
  if (!days.has(ISO(cursor))) cursor = subDays(cursor, 1);
  let streak = 0;
  while (days.has(ISO(cursor))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export function longestStreak(sessions: ReadingSession[]): number {
  const days = [...readDays(sessions)].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of days) {
    const cur = parseISO(d);
    if (prev && differenceInCalendarDays(cur, prev) === 1) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = cur;
  }
  return best;
}

// --- Daily totals ----------------------------------------------------------
export function pagesOn(dateISO: string, sessions: ReadingSession[]): number {
  return sessions
    .filter((s) => s.happened_on === dateISO)
    .reduce((sum, s) => sum + (s.pages_read || 0), 0);
}
export function minutesOn(dateISO: string, sessions: ReadingSession[]): number {
  return sessions
    .filter((s) => s.happened_on === dateISO)
    .reduce((sum, s) => sum + (s.minutes || 0), 0);
}

export const totalPages = (s: ReadingSession[]) =>
  s.reduce((n, x) => n + (x.pages_read || 0), 0);
export const totalMinutes = (s: ReadingSession[]) =>
  s.reduce((n, x) => n + (x.minutes || 0), 0);

// --- Time series -----------------------------------------------------------
export type Granularity = "day" | "week" | "month";

export interface SeriesPoint {
  key: string; // bucket key (date / week-start / month-start)
  label: string; // short display label
  pages: number;
  minutes: number;
}

function bucketKey(d: Date, g: Granularity): Date {
  if (g === "month") return startOfMonth(d);
  if (g === "week") return startOfWeek(d, { weekStartsOn: 1 });
  return d;
}
function bucketLabel(d: Date, g: Granularity): string {
  if (g === "month") return format(d, "MMM");
  if (g === "week") return format(d, "d MMM");
  return format(d, "d MMM");
}

// Pages + minutes per bucket across the last `days` days.
export function series(
  sessions: ReadingSession[],
  days: number,
  g: Granularity,
): SeriesPoint[] {
  const since = subDays(new Date(), days - 1);
  const map = new Map<string, SeriesPoint>();
  for (const s of sessions) {
    const d = parseISO(s.happened_on);
    if (d < since) continue;
    const b = bucketKey(d, g);
    const key = ISO(b);
    const cur =
      map.get(key) ?? { key, label: bucketLabel(b, g), pages: 0, minutes: 0 };
    cur.pages += s.pages_read || 0;
    cur.minutes += s.minutes || 0;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

// --- Reading speed ---------------------------------------------------------
// Overall pages/hour from sessions that recorded minutes.
export function readingSpeed(sessions: ReadingSession[]): number | null {
  const timed = sessions.filter((s) => (s.minutes ?? 0) > 0 && s.pages_read > 0);
  if (!timed.length) return null;
  const pages = timed.reduce((n, s) => n + s.pages_read, 0);
  const mins = timed.reduce((n, s) => n + (s.minutes || 0), 0);
  if (!mins) return null;
  return (pages / mins) * 60;
}

// Per-week average reading speed (pages/hour) — the improvement trend.
export function speedTrend(sessions: ReadingSession[]): { label: string; speed: number }[] {
  const byWeek = new Map<string, { pages: number; minutes: number; d: Date }>();
  for (const s of sessions) {
    if (!s.minutes || s.minutes <= 0 || !s.pages_read) continue;
    const wk = startOfWeek(parseISO(s.happened_on), { weekStartsOn: 1 });
    const key = ISO(wk);
    const cur = byWeek.get(key) ?? { pages: 0, minutes: 0, d: wk };
    cur.pages += s.pages_read;
    cur.minutes += s.minutes;
    byWeek.set(key, cur);
  }
  return [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => ({
      label: format(v.d, "d MMM"),
      speed: Math.round((v.pages / v.minutes) * 60),
    }));
}

// --- Book-level breakdowns -------------------------------------------------
export function booksFinishedByMonth(books: Book[]): { label: string; count: number }[] {
  const map = new Map<string, { d: Date; count: number }>();
  for (const b of books) {
    if (b.read_status !== "read" || !b.finished_on) continue;
    const d = startOfMonth(parseISO(b.finished_on));
    const key = ISO(d);
    const cur = map.get(key) ?? { d, count: 0 };
    cur.count++;
    map.set(key, cur);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => ({ label: format(v.d, "MMM ''yy"), count: v.count }));
}

export function genreBreakdown(books: Book[]): { name: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const b of books) {
    for (const t of b.tags ?? []) {
      if (t.kind !== "genre") continue;
      counts.set(t.name, (counts.get(t.name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function ratingDistribution(books: Book[]): { label: string; count: number }[] {
  const buckets = [1, 2, 3, 4, 5].map((n) => ({ label: `${n}★`, count: 0 }));
  for (const b of books) {
    if (b.rating == null) continue;
    const idx = Math.min(4, Math.max(0, Math.round(b.rating) - 1));
    buckets[idx].count++;
  }
  return buckets;
}

export function topAuthors(books: Book[], limit = 8): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const b of books) {
    for (const a of uniqueAuthors(b.authors)) {
      counts.set(a, (counts.get(a) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// --- Heatmap (last N weeks) ------------------------------------------------
export interface HeatCell {
  date: string;
  pages: number;
}
// Returns weeks (columns) of 7 days (Mon→Sun) for the contribution-style grid.
export function heatmap(sessions: ReadingSession[], weeks = 26): HeatCell[][] {
  const totals = new Map<string, number>();
  for (const s of sessions) {
    totals.set(s.happened_on, (totals.get(s.happened_on) ?? 0) + (s.pages_read || 0));
  }
  const end = new Date();
  const start = startOfWeek(subDays(end, (weeks - 1) * 7), { weekStartsOn: 1 });
  const cols: HeatCell[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const key = ISO(cursor);
      col.push({ date: key, pages: totals.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    cols.push(col);
  }
  return cols;
}

export function isAudiobook(book: Book): boolean {
  return book.format === "audiobook";
}

// Progress percent — pages for books, minutes for audiobooks.
export function readingProgress(book: Book): number | null {
  if (isAudiobook(book)) {
    if (!book.duration_minutes || !book.audio_position_minutes) return null;
    return Math.min(
      100,
      Math.round((book.audio_position_minutes / book.duration_minutes) * 100),
    );
  }
  if (!book.page_count || !book.current_page) return null;
  return Math.min(100, Math.round((book.current_page / book.page_count) * 100));
}

// Average pages on the days you actually read, over the last N days.
export function avgPagesPerActiveDay(
  sessions: ReadingSession[],
  days = 30,
): number | null {
  const since = subDays(new Date(), days - 1);
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    if (parseISO(s.happened_on) < since) continue;
    byDay.set(s.happened_on, (byDay.get(s.happened_on) ?? 0) + (s.pages_read || 0));
  }
  const vals = [...byDay.values()].filter((v) => v > 0);
  if (!vals.length) return null;
  return vals.reduce((n, v) => n + v, 0) / vals.length;
}

export interface FinishEstimate {
  minutesLeft: number | null; // wall-clock reading/listening time left
  daysLeft: number | null; // sittings at your recent daily pace (books only)
  unitsLeft: number; // pages or minutes remaining
  isAudio: boolean;
}

// Estimate how much is left to finish a book the user is reading.
export function estimateTimeLeft(
  book: Book,
  sessions: ReadingSession[],
): FinishEstimate | null {
  if (isAudiobook(book)) {
    if (!book.duration_minutes) return null;
    const left = Math.max(0, book.duration_minutes - (book.audio_position_minutes ?? 0));
    return { minutesLeft: left, daysLeft: null, unitsLeft: left, isAudio: true };
  }
  if (!book.page_count) return null;
  const pagesLeft = Math.max(0, book.page_count - (book.current_page ?? 0));
  if (pagesLeft === 0)
    return { minutesLeft: 0, daysLeft: 0, unitsLeft: 0, isAudio: false };
  const speed = readingSpeed(sessions); // pages/hr
  const minutesLeft = speed ? Math.round((pagesLeft / speed) * 60) : null;
  const perDay = avgPagesPerActiveDay(sessions);
  const daysLeft = perDay ? Math.ceil(pagesLeft / perDay) : null;
  return { minutesLeft, daysLeft, unitsLeft: pagesLeft, isAudio: false };
}

// Friendly duration: "3h 12m" / "45m" / "2h".
export function fmtDuration(min: number): string {
  const total = Math.round(min);
  if (total < 1) return "0m";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
