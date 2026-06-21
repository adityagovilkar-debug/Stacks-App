import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Trim, drop blanks, and remove case-insensitive duplicate author names
// (keeping the first spelling). ISBN lookups occasionally return the same
// author twice, which otherwise double-counts them in the stats.
export function uniqueAuthors(
  authors: (string | null | undefined)[] | null | undefined,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of authors ?? []) {
    const name = (a ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}
