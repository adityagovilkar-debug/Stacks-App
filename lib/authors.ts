// Group the library by author for the Authors index and author pages.

import type { Book } from "./types";
import { uniqueAuthors } from "./utils";

export interface AuthorSummary {
  name: string;
  books: Book[]; // in your library (owned, wishlist, lent… — not removed)
  read: number;
  reading: number;
  wishlist: number;
  avgRating: number | null;
}

export const authorKey = (name: string) => name.trim().toLowerCase();
export const authorHref = (name: string) => `/authors/${encodeURIComponent(name.trim())}`;

export function authorIndex(books: Book[]): AuthorSummary[] {
  const map = new Map<string, AuthorSummary>();
  for (const b of books) {
    for (const a of uniqueAuthors(b.authors)) {
      const k = authorKey(a);
      const s = map.get(k) ?? { name: a, books: [], read: 0, reading: 0, wishlist: 0, avgRating: null };
      s.books.push(b);
      map.set(k, s);
    }
  }
  for (const s of map.values()) {
    s.read = s.books.filter((b) => b.times_read > 0 || b.read_status === "read").length;
    s.reading = s.books.filter((b) => b.read_status === "reading").length;
    s.wishlist = s.books.filter((b) => b.ownership === "wishlist").length;
    const rated = s.books.map((b) => b.rating).filter((r): r is number => r != null && r > 0);
    s.avgRating = rated.length ? rated.reduce((n, r) => n + r, 0) / rated.length : null;
  }
  return [...map.values()];
}

export function booksByAuthor(books: Book[], name: string): Book[] {
  const k = authorKey(name);
  return books.filter((b) => uniqueAuthors(b.authors).some((a) => authorKey(a) === k));
}
