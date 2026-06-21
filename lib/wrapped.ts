// "Year in Review / Wrapped" — a per-year summary of your reading, built from
// the same books + sessions data. Pure functions, no side effects.

import type { Book, ReadingSession } from "./types";

export interface Wrapped {
  year: number;
  booksFinished: number;
  pagesRead: number;
  minutes: number;
  daysRead: number;
  sessions: number;
  avgRating: number | null;
  topGenres: { name: string; value: number }[];
  topAuthors: { name: string; count: number }[];
  longest: Book | null;
  highestRated: Book | null;
  fastest: { book: Book; speed: number } | null;
  finishedBooks: Book[];
}

// Years that have any activity (finished books or logged sessions), newest
// first, always including the current year.
export function availableYears(books: Book[], sessions: ReadingSession[]): number[] {
  const set = new Set<number>();
  for (const b of books) if (b.finished_on) set.add(Number(b.finished_on.slice(0, 4)));
  for (const s of sessions) set.add(Number(s.happened_on.slice(0, 4)));
  set.add(new Date().getFullYear());
  return [...set].filter(Boolean).sort((a, b) => b - a);
}

export function wrappedStats(
  books: Book[],
  sessions: ReadingSession[],
  year: number,
): Wrapped {
  const y = String(year);
  const finished = books.filter(
    (b) => b.read_status === "read" && b.finished_on?.startsWith(y),
  );
  const ys = sessions.filter((s) => s.happened_on.startsWith(y));

  const pagesRead = ys.reduce((n, s) => n + (s.pages_read || 0), 0);
  const minutes = ys.reduce((n, s) => n + (s.minutes || 0), 0);
  const daysRead = new Set(ys.map((s) => s.happened_on)).size;

  const ratings = finished
    .map((b) => b.rating)
    .filter((r): r is number => r != null);
  const avgRating = ratings.length
    ? ratings.reduce((n, r) => n + r, 0) / ratings.length
    : null;

  const gmap = new Map<string, number>();
  for (const b of finished)
    for (const t of b.tags ?? [])
      if (t.kind === "genre") gmap.set(t.name, (gmap.get(t.name) ?? 0) + 1);
  const topGenres = [...gmap]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const amap = new Map<string, number>();
  for (const b of finished)
    for (const a of b.authors ?? []) amap.set(a, (amap.get(a) ?? 0) + 1);
  const topAuthors = [...amap]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const longest =
    finished
      .filter((b) => b.page_count)
      .sort((a, b) => (b.page_count ?? 0) - (a.page_count ?? 0))[0] ?? null;

  const highestRated =
    [...finished]
      .filter((b) => b.rating != null)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] ?? null;

  let fastest: { book: Book; speed: number } | null = null;
  for (const b of finished) {
    const bs = ys.filter(
      (s) => s.book_id === b.id && (s.minutes ?? 0) > 0 && s.pages_read > 0,
    );
    if (!bs.length) continue;
    const p = bs.reduce((n, s) => n + s.pages_read, 0);
    const m = bs.reduce((n, s) => n + (s.minutes || 0), 0);
    if (!m) continue;
    const speed = (p / m) * 60;
    if (!fastest || speed > fastest.speed) fastest = { book: b, speed };
  }

  return {
    year,
    booksFinished: finished.length,
    pagesRead,
    minutes,
    daysRead,
    sessions: ys.length,
    avgRating,
    topGenres,
    topAuthors,
    longest,
    highestRated,
    fastest,
    finishedBooks: [...finished].sort((a, b) =>
      (a.finished_on ?? "").localeCompare(b.finished_on ?? ""),
    ),
  };
}
