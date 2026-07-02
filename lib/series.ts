// Group the library into series and work out which volumes are missing, so you
// can see gaps at a glance ("you have #1, #3, #4 — missing #2").

import type { Book } from "./types";

export interface SeriesGroup {
  name: string;
  books: Book[]; // sorted by series_index (unindexed last)
  haveIndices: number[]; // integer volume numbers present
  missing: number[]; // integer gaps from 1 up to the highest owned volume
  total: number;
  readCount: number;
}

function normName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function seriesGroups(books: Book[]): SeriesGroup[] {
  const map = new Map<string, { name: string; books: Book[] }>();
  for (const b of books) {
    if (!b.series_name?.trim()) continue;
    const key = normName(b.series_name);
    const g = map.get(key) ?? { name: b.series_name.trim(), books: [] };
    g.books.push(b);
    map.set(key, g);
  }

  const out: SeriesGroup[] = [];
  for (const g of map.values()) {
    const sorted = [...g.books].sort((a, b) => {
      const ai = a.series_index ?? Infinity;
      const bi = b.series_index ?? Infinity;
      if (ai !== bi) return ai - bi;
      return a.title.localeCompare(b.title);
    });
    const haveIndices = [
      ...new Set(
        sorted
          .map((b) => b.series_index)
          .filter((n): n is number => n != null && Number.isInteger(n)),
      ),
    ].sort((a, b) => a - b);

    const missing: number[] = [];
    if (haveIndices.length) {
      const max = haveIndices[haveIndices.length - 1];
      const set = new Set(haveIndices);
      // Flag every whole number from 1 up to your highest volume that you
      // don't own — that catches both interior gaps and a missing start.
      for (let i = 1; i <= max; i++) if (!set.has(i)) missing.push(i);
    }

    out.push({
      name: g.name,
      books: sorted,
      haveIndices,
      missing,
      total: sorted.length,
      readCount: sorted.filter((b) => b.read_status === "read").length,
    });
  }

  // Only worth showing a "series" with more than one book, or a single volume
  // that's clearly mid-series (has a gap before it).
  return out
    .filter((g) => g.total >= 2 || g.missing.length > 0)
    .sort((a, b) => {
      const ag = a.missing.length > 0 ? 1 : 0;
      const bg = b.missing.length > 0 ? 1 : 0;
      if (ag !== bg) return bg - ag; // gapped series first (actionable)
      if (b.total !== a.total) return b.total - a.total;
      return a.name.localeCompare(b.name);
    });
}
