// Detect likely-duplicate books so the user can review + remove accidental
// double-adds — without forbidding *intentional* extra copies (different
// editions or covers, which carry different ISBNs and so won't be grouped).

import type { Book } from "./types";
import { isbn10to13 } from "./lookup";

// Canonical form: always ISBN-13, so the same edition recorded once as
// ISBN-10 and once as ISBN-13 is still recognised as the same book.
function normIsbn(s: string | null | undefined): string {
  const raw = s ? s.replace(/[^0-9X]/gi, "").toUpperCase() : "";
  if (raw.length === 10) return isbn10to13(raw) ?? raw;
  return raw;
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
    // Copies you've already marked as editions of one work aren't duplicates.
    .filter((g) => !(g[0].work_id && g.every((b) => b.work_id === g[0].work_id)))
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

// ---- Editions ---------------------------------------------------------
// The same *work* regardless of edition: normalised title (no subtitle or
// bracketed notes) + first author's surname.
export function workKey(title: string, authors: string[]): string {
  const t = (title ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .split(":")[0]
    .replace(/^(the|a|an)\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const a = (authors?.[0] ?? "").trim().toLowerCase().split(/\s+/).pop() ?? "";
  return `${t}|${a}`;
}

// Other books in the library that look like a different edition of this one
// (same work, different ISBN / record) — candidates to link as editions.
export function otherEditions(books: Book[], book: Pick<Book, "id" | "title" | "authors">): Book[] {
  const k = workKey(book.title, book.authors);
  return books.filter((b) => b.id !== book.id && workKey(b.title, b.authors) === k);
}
