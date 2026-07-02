// Build shareable text for a set of books and hand it to the platform. On
// Android, navigator.share opens the native sheet (WhatsApp, Gmail, …); we also
// expose direct WhatsApp/email links and a clipboard fallback for everywhere
// else.

import type { Book } from "./types";

function stars(rating: number | null): string {
  if (!rating || rating <= 0) return "";
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return " " + "★".repeat(full) + (half ? "½" : "");
}

// One line per book: "1. Title — Author (Year) ★★★★"
export function bookShareLine(b: Book, index?: number): string {
  const author = b.authors?.length ? ` — ${b.authors.join(", ")}` : "";
  const year = b.published_year ? ` (${b.published_year})` : "";
  const prefix = index != null ? `${index + 1}. ` : "";
  return `${prefix}${b.title}${author}${year}${stars(b.rating)}`;
}

export function buildShareText(books: Book[]): string {
  if (!books.length) return "";
  const header =
    books.length === 1 ? "📚 A book I'd recommend:" : "📚 Books I'd recommend:";
  const numbered = books.length > 1;
  const lines = books.map((b, i) => bookShareLine(b, numbered ? i : undefined));
  return `${header}\n\n${lines.join("\n")}\n\n— shared from my Stacks library`;
}

export function whatsappHref(books: Book[]): string {
  return `https://wa.me/?text=${encodeURIComponent(buildShareText(books))}`;
}

export function mailtoHref(books: Book[]): string {
  const subject =
    books.length === 1 ? `A book recommendation: ${books[0].title}` : "Book recommendations";
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    buildShareText(books),
  )}`;
}

export type ShareResult = "shared" | "copied" | "cancelled" | "unsupported";

// Prefer the native share sheet; fall back to copying the text.
export async function shareBooks(books: Book[]): Promise<ShareResult> {
  if (!books.length) return "unsupported";
  const text = buildShareText(books);
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: "Book recommendations", text });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      // otherwise fall through to clipboard
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "unsupported";
  }
}
