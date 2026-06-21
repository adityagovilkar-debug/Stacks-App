// Detect likely-duplicate books so the user can review + remove accidental
// double-adds — without forbidding *intentional* extra copies (different
// editions or covers, which carry different ISBNs and so won't be grouped).

import type { Book } from "./types";

function normIsbn(s: string | null | undefined): string {
  return s ? s.replace(/[^0-9X]/gi, "").toUpperCase() : "";
}

// The grouping key: same edition (matching ISBN) groups together; with no
// ISBN we fall back to normalized title + first author.
export function keyForFields(
  isbn13: string | null | undefined,
  isbn10: string | null | undefined,
  title: string,
  authors: string[],
): string {
  const isbn = normIsbn(isbn13) || normIsbn(isbn10);
  if (isbn) return `i:${isbn}`;
  const t = (title ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const a = (authors?.[0] ?? "").trim().toLowerCase();
  return `t:${t}|${a}`;
}

export function dedupKey(b: Book): string {
  return keyForFields(b.isbn13, b.isbn10, b.title, b.authors);
}

// Groups of 2+ books that share a key, most-duplicated first; copies within a
// group are ordered oldest-first (so the original is on top).
export function duplicateGroups(books: Book[]): Book[][] {
  const map = new Map<string, Book[]>();
  for (const b of books) {
    const k = dedupKey(b);
    const arr = map.get(k);
    if (arr) arr.push(b);
    else map.set(k, [b]);
  }
  return [...map.values()]
    .filter((g) => g.length > 1)
    .map((g) =>
      [...g].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    )
    .sort((a, b) => b.length - a.length);
}

// Does the candidate match a book already in the library?
export function findExisting(
  books: Book[],
  candidate: {
    isbn13?: string | null;
    isbn10?: string | null;
    title: string;
    authors: string[];
  },
): Book | null {
  const k = keyForFields(
    candidate.isbn13,
    candidate.isbn10,
    candidate.title,
    candidate.authors,
  );
  return books.find((b) => dedupKey(b) === k) ?? null;
}
