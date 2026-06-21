// Match the free-text categories an ISBN lookup returns (e.g. Google Books'
// "Fiction / Science fiction / General") against the user's existing genre
// tags, so adding a book can pre-select sensible genres automatically.

import type { Tag } from "./types";

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchGenreTags(
  categories: string[] | null | undefined,
  tags: Tag[],
): string[] {
  if (!categories?.length) return [];
  const genres = tags.filter((t) => t.kind === "genre");
  if (!genres.length) return [];

  // Build a token set from each category and its slash/comma-separated parts.
  const tokens: string[] = [];
  for (const c of categories) {
    tokens.push(norm(c));
    for (const part of c.split(/[/,&;>\-]/)) {
      const p = norm(part);
      if (p) tokens.push(p);
    }
  }

  const ids = new Set<string>();
  for (const g of genres) {
    const gn = norm(g.name);
    if (!gn) continue;
    for (const tok of tokens) {
      if (!tok) continue;
      const match =
        tok === gn ||
        (tok.length >= 4 && gn.length >= 4 && (tok.includes(gn) || gn.includes(tok)));
      if (match) {
        ids.add(g.id);
        break;
      }
    }
  }
  return [...ids];
}
