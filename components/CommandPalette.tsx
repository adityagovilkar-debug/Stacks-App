"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Home,
  Library,
  ScanLine,
  ListChecks,
  NotebookPen,
  BarChart3,
  Sparkles,
  Quote as QuoteIcon,
  MapPin,
  Settings,
  BookOpen,
  Book as BookIcon,
  Tag as TagIcon,
  FolderHeart,
  Bookmark,
  Layers,
  HandHelping,
  Dice5,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useBooks, useTags, useCollections, useSavedViews, useQuotes } from "@/lib/queries";
import { COMMAND_EVENT, openLogSession } from "@/lib/events";
import { libraryHref } from "@/lib/viewQuery";
import { cn } from "@/lib/utils";

// Subsequence fuzzy match so "wats" finds "Watts". Substring hits rank first.
function fuzzyRank(needle: string, hay: string): number | null {
  const n = needle.toLowerCase();
  const h = hay.toLowerCase();
  if (!n) return 0;
  const idx = h.indexOf(n);
  if (idx >= 0) return idx; // exact substring — best, earlier = better
  let i = 0;
  for (let j = 0; j < h.length && i < n.length; j++) {
    if (h[j] === n[i]) i++;
  }
  return i === n.length ? 1000 + h.length : null; // subsequence — worse
}

interface Item {
  id: string;
  group: string;
  label: string;
  sub?: string;
  icon: LucideIcon;
  run: () => void;
}

const PAGES: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Library", href: "/library", icon: Library },
  { label: "Add a book", href: "/add", icon: ScanLine },
  { label: "Reading queue", href: "/queue", icon: ListChecks },
  { label: "What next? (pick a book)", href: "/next", icon: Dice5 },
  { label: "Series", href: "/series", icon: Layers },
  { label: "Lending desk", href: "/lending", icon: HandHelping },
  { label: "Reading log", href: "/log", icon: NotebookPen },
  { label: "Progress / stats", href: "/stats", icon: BarChart3 },
  { label: "Year in review", href: "/wrapped", icon: Sparkles },
  { label: "Commonplace book", href: "/quotes", icon: QuoteIcon },
  { label: "Shelf map", href: "/shelf", icon: MapPin },
  { label: "Settings", href: "/settings", icon: Settings },
];

// Global ⌘K / Ctrl+K palette: jump to any book, tag, collection, or page.
export function CommandPalette() {
  const router = useRouter();
  const { data: books = [] } = useBooks();
  const { data: tags = [] } = useTags();
  const { data: collections = [] } = useCollections();
  const { data: savedViews = [] } = useSavedViews();
  const { data: quotes = [] } = useQuotes();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener(COMMAND_EVENT, onEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(COMMAND_EVENT, onEvent);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      document.body.style.overflow = "hidden";
      return () => clearTimeout(t);
    }
    document.body.style.overflow = "";
  }, [open]);

  const go = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  const items: Item[] = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const actions: Item[] = [
      {
        id: "a-log",
        group: "Actions",
        label: "Log reading",
        icon: BookOpen,
        run: () => {
          setOpen(false);
          openLogSession();
        },
      },
      { id: "a-add", group: "Actions", label: "Add a book", icon: ScanLine, run: () => go("/add") },
    ];
    const pages: Item[] = PAGES.map((p) => ({
      id: "p-" + p.href,
      group: "Go to",
      label: p.label,
      icon: p.icon,
      run: () => go(p.href),
    }));

    if (!needle) return [...actions, ...pages];

    const match = (s: string) => fuzzyRank(needle, s) != null;
    const out: Item[] = [];
    out.push(...actions.filter((a) => match(a.label)));
    out.push(...pages.filter((p) => match(p.label)));
    for (const b of books) {
      if (out.length > 60) break;
      if (match(b.title) || (b.authors ?? []).some(match))
        out.push({
          id: "b-" + b.id,
          group: "Books",
          label: b.title,
          sub: b.authors?.join(", "),
          icon: BookIcon,
          run: () => go(`/book/${b.id}`),
        });
    }
    for (const v of savedViews)
      if (match(v.name))
        out.push({
          id: "v-" + v.id,
          group: "Shelves",
          label: v.name,
          icon: Bookmark,
          run: () => go(libraryHref(v.query)),
        });
    for (const t of tags)
      if (match(t.name))
        out.push({
          id: "t-" + t.id,
          group: "Tags",
          label: t.name,
          sub: t.kind,
          icon: TagIcon,
          run: () => go(`/library?tags=${t.id}`),
        });
    for (const c of collections)
      if (match(c.name))
        out.push({
          id: "c-" + c.id,
          group: "Collections",
          label: c.name,
          icon: FolderHeart,
          run: () => go(`/library?collection=${c.id}`),
        });
    for (const qt of quotes) {
      if (out.length > 90) break;
      if (match(qt.text))
        out.push({
          id: "q-" + qt.id,
          group: "Quotes",
          label: qt.text,
          sub: qt.book?.title,
          icon: QuoteIcon,
          run: () => go(`/book/${qt.book_id}`),
        });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, books, tags, collections, savedViews, quotes]);

  useEffect(() => setActive(0), [q]);

  if (!open) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[active]?.run();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  let lastGroup = "";
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#1a1430]/50 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="card w-full max-w-lg overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b-[2.5px] border-outline px-4 py-3">
          <Search className="h-5 w-5 text-text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search books, tags, pages…"
            className="w-full bg-transparent text-base outline-none placeholder:text-text-muted/60"
          />
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="rounded p-1 text-text-muted hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">No matches.</p>
          ) : (
            items.map((it, i) => {
              const header = it.group !== lastGroup ? it.group : null;
              lastGroup = it.group;
              return (
                <div key={it.id}>
                  {header && (
                    <div className="px-4 pb-1 pt-2 text-[0.65rem] font-bold uppercase tracking-wide text-text-muted">
                      {header}
                    </div>
                  )}
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => it.run()}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-left",
                      i === active ? "bg-riso-blue/15" : "",
                    )}
                  >
                    <it.icon className="h-4 w-4 shrink-0 text-text-muted" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {it.label}
                    </span>
                    {it.sub && (
                      <span className="shrink-0 truncate text-xs text-text-muted">
                        {it.sub}
                      </span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t-2 border-border px-4 py-2 text-[0.65rem] text-text-muted">
          ↑↓ navigate · ↵ open · esc close
        </div>
      </div>
    </div>
  );
}
