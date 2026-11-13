// Parse a Kindle "My Clippings.txt" file (Kindle → connect by USB → documents
// folder) into highlights and notes, grouped by book, and match each group to
// a book in the library.
//
// A clipping looks like:
//   Leviathan Wakes (The Expanse Book 1) (James S. A. Corey)
//   - Your Highlight on page 12 | Location 170-172 | Added on Monday, 3 March 2025 10:12:33
//
//   The text of the highlight.
//   ==========

import type { Book } from "./types";

export interface Clipping {
  kind: "highlight" | "note";
  text: string;
  page: number | null;
  location: number | null; // start location
  addedAt: string | null; // ISO timestamp
}

export interface ClippingGroup {
  rawTitle: string; // as written in the file (title + series)
  author: string | null;
  clippings: Clipping[];
}

function parseDate(meta: string): string | null {
  const m = meta.match(/Added on\s+(.*)$/i);
  if (!m) return null;
  // Drop the weekday ("Monday, ") — the rest parses in modern browsers.
  const s = m[1].replace(/^[A-Za-z]+,\s*/, "").trim();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parseHeader(line: string): { title: string; author: string | null } {
  const clean = line.replace(/^﻿/, "").trim();
  const m = clean.match(/^(.*)\(([^()]*)\)\s*$/);
  if (m && m[1].trim()) return { title: m[1].trim(), author: m[2].trim() || null };
  return { title: clean, author: null };
}

export function parseClippings(text: string): ClippingGroup[] {
  const groups = new Map<string, ClippingGroup>();
  const blocks = text.replace(/\r/g, "").split(/^=+\s*$/m);
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim());
    while (lines.length && !lines[0]) lines.shift();
    if (lines.length < 2) continue;
    const header = parseHeader(lines[0]);
    const meta = lines[1];
    const kindMatch = meta.match(/Your (Highlight|Note|Bookmark)/i);
    if (!kindMatch) continue;
    const kind = kindMatch[1].toLowerCase();
    if (kind === "bookmark") continue;
    const body = lines.slice(2).join("\n").trim();
    if (!body) continue;
    const page = meta.match(/page\s+(\d+)/i);
    const loc = meta.match(/Location\s+(\d+)/i);
    const key = `${header.title}|${header.author ?? ""}`;
    const g = groups.get(key) ?? { rawTitle: header.title, author: header.author, clippings: [] };
    g.clippings.push({
      kind: kind as "highlight" | "note",
      text: body,
      page: page ? Number(page[1]) : null,
      location: loc ? Number(loc[1]) : null,
      addedAt: parseDate(meta),
    });
    groups.set(key, g);
  }

  // Kindle keeps the old highlight when you extend one: drop highlights whose
  // text sits inside a longer highlight of the same book, and exact repeats.
  for (const g of groups.values()) {
    const hs = g.clippings.filter((c) => c.kind === "highlight");
    const keep = new Set<Clipping>();
    for (const h of hs) {
      const swallowed = hs.some(
        (o) => o !== h && o.text.length > h.text.length && o.text.includes(h.text),
      );
      const dupe = [...keep].some((k) => k.text === h.text);
      if (!swallowed && !dupe) keep.add(h);
    }
    g.clippings = g.clippings.filter((c) => c.kind === "note" || keep.has(c));
  }
  return [...groups.values()].filter((g) => g.clippings.length);
}

// ---- matching ------------------------------------------------------------
export function normTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // series / edition notes in brackets
    .split(":")[0] // drop subtitles
    .replace(/^(the|a|an)\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function surname(s: string | null | undefined): string {
  if (!s) return "";
  // Kindle sometimes writes "Corey, James S. A."
  const name = s.includes(",") ? s.split(",")[0] : s.trim().split(/\s+/).pop() ?? "";
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

// Best library match for a clippings group, or null.
export function matchBook(group: ClippingGroup, books: Book[]): Book | null {
  const t = normTitle(group.rawTitle);
  if (!t) return null;
  const sn = surname(group.author);
  const same = books.filter((b) => normTitle(b.title) === t);
  const pick = (list: Book[]) =>
    list.find((b) => sn && b.authors.some((a) => surname(a) === sn)) ?? list[0] ?? null;
  if (same.length) return pick(same);
  // Fallback: one title starts with the other (e.g. missing subtitle words).
  const loose = books.filter((b) => {
    const bt = normTitle(b.title);
    return bt.length > 3 && (bt.startsWith(t) || t.startsWith(bt));
  });
  return loose.length ? pick(loose) : null;
}

export const normQuote = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
