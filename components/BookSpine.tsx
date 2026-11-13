"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Book } from "@/lib/types";

const INKS = [
  { bg: "#ff4f9a", fg: "#fff" },
  { bg: "#0b63f6", fg: "#fff" },
  { bg: "#ffd23f", fg: "#1a1430" },
  { bg: "#ff6f3c", fg: "#fff" },
  { bg: "#7b5cff", fg: "#fff" },
  { bg: "#1a1430", fg: "#ffd23f" },
  { bg: "#fdf8ee", fg: "#1a1430" },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// One book drawn as a spine on a shelf: width follows page count, height and
// ink come from the title (stable), a pink ribbon marks what you're reading.
export const SPINE_ROW = 150; // px — the shelf row height (spines sit on the plank)

export function BookSpine({
  book,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  book: Book;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const h = hash(book.title + (book.authors[0] ?? ""));
  const ink = INKS[h % INKS.length];
  const pages = book.page_count ?? (book.total_locations ? book.total_locations / 15 : 300);
  const width = Math.max(18, Math.min(46, Math.round(pages / 14)));
  const height = 112 + (h % 30); // 112–141 px
  const band = h % 3 === 0;
  const wanted = book.ownership === "wishlist";

  const inner = (
    <span
      className={cn(
        "relative flex items-start justify-center overflow-hidden rounded-[3px] border-2 border-outline py-2 font-display text-[11px] font-extrabold leading-none transition-transform group-hover:-translate-y-1.5",
        ink.bg !== "#fdf8ee" && ink.bg !== "#1a1430" && "halftone",
        wanted && "border-dashed opacity-60",
        selected && "outline outline-[3px] outline-riso-blue",
      )}
      style={{ width, height, backgroundColor: ink.bg, color: ink.fg, writingMode: "vertical-rl" }}
    >
      {band && (
        <span
          className="absolute inset-x-0 top-3 h-[7px] border-y-2 border-outline"
          style={{ background: ink.bg === "#ffd23f" ? "#ff4f9a" : "#ffd23f" }}
        />
      )}
      <span className="relative max-h-full truncate px-0.5">{book.title}</span>
      {book.read_status === "reading" && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 left-1/2 h-4 w-[7px] -translate-x-1/2 border-x-[1.5px] border-outline bg-riso-pink [clip-path:polygon(0_0,100%_0,100%_100%,50%_75%,0_100%)]"
        />
      )}
    </span>
  );

  const wrap = "group flex shrink-0 flex-col justify-end";
  const title = `${book.title}${book.authors[0] ? ` — ${book.authors[0]}` : ""}`;
  if (selectable)
    return (
      <button type="button" onClick={onToggleSelect} className={wrap} style={{ height: SPINE_ROW }} title={title} aria-pressed={selected}>
        {inner}
      </button>
    );
  return (
    <Link href={`/book/${book.id}`} className={wrap} style={{ height: SPINE_ROW }} title={title}>
      {inner}
    </Link>
  );
}
