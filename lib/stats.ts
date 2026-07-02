// Pure helpers for the reading-habit analytics: streaks, pages/minutes over
// time, reading speed, and breakdowns. All operate on plain arrays so they're
// trivial to test and reuse across the dashboard + stats page.

import {
  format,
  parseISO,
  subDays,
  addDays,
  addMonths,
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

// Every bucket ({key,label}) spanning the last `days` days, oldest→newest, so
// charts show empty periods as zero-height bars instead of silently dropping
// them (a quiet week should read as a quiet week, not compress the axis).
function enumerateBuckets(days: number, g: Granularity): { key: string; label: string }[] {
  let cur = bucketKey(subDays(new Date(), days - 1), g);
  const end = bucketKey(new Date(), g);
  const out: { key: string; label: string }[] = [];
  let guard = 0;
  while (cur.getTime() <= end.getTime() && guard++ < 400) {
    out.push({ key: ISO(cur), label: bucketLabel(cur, g) });
    cur = g === "month" ? addMonths(cur, 1) : addDays(cur, g === "week" ? 7 : 1);
  }
  return out;
}

// Pages + minutes per bucket across the last `days` days (zero-filled).
export function series(
  sessions: ReadingSession[],
  days: number,
  g: Granularity,
): SeriesPoint[] {
  const buckets = enumerateBuckets(days, g);
  const map = new Map<string, SeriesPoint>(
    buckets.map((b) => [b.key, { ...b, pages: 0, minutes: 0 }]),
  );
  for (const s of sessions) {
    const key = ISO(bucketKey(parseISO(s.happened_on), g));
    const cur = map.get(key);
    if (!cur) continue; // outside the range
    cur.pages += s.pages_read || 0;
    cur.minutes += s.minutes || 0;
  }
  return buckets.map((b) => map.get(b.key)!);
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
    // 0 (a cleared rating from before nulling was in place) is "unrated" too.
    if (b.rating == null || b.rating <= 0) continue;
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
  minutes: number; // so audio-only days still show as activity
}
// Returns weeks (columns) of 7 days (Mon→Sun) for the contribution-style grid.
export function heatmap(sessions: ReadingSession[], weeks = 26): HeatCell[][] {
  const totals = new Map<string, { pages: number; minutes: number }>();
  for (const s of sessions) {
    const cur = totals.get(s.happened_on) ?? { pages: 0, minutes: 0 };
    cur.pages += s.pages_read || 0;
    cur.minutes += s.minutes || 0;
    totals.set(s.happened_on, cur);
  }
  const end = new Date();
  const start = startOfWeek(subDays(end, (weeks - 1) * 7), { weekStartsOn: 1 });
  const cols: HeatCell[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const key = ISO(cursor);
      const t = totals.get(key);
      col.push({ date: key, pages: t?.pages ?? 0, minutes: t?.minutes ?? 0 });
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

// --- Time-spent series (minutes), split into print vs audiobook -------------
export interface TimePoint {
  key: string;
  label: string;
  print: number;
  audio: number;
}
export function minutesSeries(
  sessions: ReadingSession[],
  days: number,
  g: Granularity,
): TimePoint[] {
  const buckets = enumerateBuckets(days, g);
  const map = new Map<string, TimePoint>(
    buckets.map((b) => [b.key, { ...b, print: 0, audio: 0 }]),
  );
  for (const s of sessions) {
    if (!s.minutes) continue;
    const cur = map.get(ISO(bucketKey(parseISO(s.happened_on), g)));
    if (!cur) continue;
    if (s.book?.format === "audiobook") cur.audio += s.minutes;
    else cur.print += s.minutes;
  }
  return buckets.map((b) => map.get(b.key)!);
}

// --- Reading patterns ------------------------------------------------------
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export interface WeekdayPoint {
  day: string;
  short: string;
  pages: number;
  minutes: number; // audiobook minutes
  units: number; // pages + audio-minute-equivalent (~2 min/page), for ranking
}

export function readingByWeekday(sessions: ReadingSession[]): WeekdayPoint[] {
  const pages = new Array(7).fill(0);
  const minutes = new Array(7).fill(0);
  for (const s of sessions) {
    const d = parseISO(s.happened_on).getDay();
    if (s.book?.format === "audiobook") minutes[d] += s.minutes || 0;
    else pages[d] += s.pages_read || 0;
  }
  // Render Mon-first for a familiar week shape.
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map((i) => ({
    day: WEEKDAYS[i],
    short: WEEKDAYS[i].slice(0, 3),
    pages: pages[i],
    minutes: minutes[i],
    units: pages[i] + Math.round(minutes[i] / 2),
  }));
}

export function bestWeekday(sessions: ReadingSession[]): { day: string; units: number } | null {
  const rows = readingByWeekday(sessions);
  const top = rows.reduce((m, x) => (x.units > m.units ? x : m), rows[0]);
  return top && top.units > 0 ? { day: top.day, units: top.units } : null;
}

export function avgSessionMinutes(sessions: ReadingSession[]): number | null {
  const t = sessions.filter((s) => (s.minutes ?? 0) > 0);
  if (!t.length) return null;
  return Math.round(t.reduce((n, s) => n + (s.minutes || 0), 0) / t.length);
}

export function avgSessionPages(sessions: ReadingSession[]): number | null {
  const t = sessions.filter((s) => s.pages_read > 0);
  if (!t.length) return null;
  return Math.round(t.reduce((n, s) => n + s.pages_read, 0) / t.length);
}

// Longest single session — by minutes if any are timed, else by pages.
export function longestSession(sessions: ReadingSession[]): ReadingSession | null {
  const timed = sessions.some((s) => (s.minutes ?? 0) > 0);
  let best: ReadingSession | null = null;
  let bestVal = -1;
  for (const s of sessions) {
    const v = timed ? s.minutes ?? 0 : s.pages_read;
    if (v > bestVal) {
      bestVal = v;
      best = s;
    }
  }
  return bestVal > 0 ? best : null;
}
