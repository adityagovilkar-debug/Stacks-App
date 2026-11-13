"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  NotebookPen,
  BarChart3,
  Dice5,
  Users,
  Layers,
  Gift,
  HandHelping,
  MessageSquareHeart,
  MapPin,
  Quote,
  Sparkles,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useBooks, useLoans, useQuotes } from "@/lib/queries";
import { seriesGroups } from "@/lib/series";
import { openCommand } from "@/lib/events";

interface Tile {
  href: string;
  label: string;
  sub: string;
  icon: LucideIcon;
  ink: string; // tile icon background
  light?: boolean; // dark icon on a light ink
}

// The phone's "More" tab: every page that isn't on the bottom bar, grouped,
// each with a small live count, plus search at the top.
export function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: books = [] } = useBooks();
  const { data: loans = [] } = useLoans();
  const { data: quotes = [] } = useQuotes();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const counts = useMemo(() => {
    const gaps = seriesGroups(books).reduce((n, g) => n + g.missing.length, 0);
    return {
      gaps,
      out: loans.filter((l) => !l.returned_on).length,
      wanted: books.filter((b) => b.ownership === "wishlist").length,
      quotes: quotes.length,
      authors: new Set(books.flatMap((b) => b.authors.map((a) => a.toLowerCase()))).size,
    };
  }, [books, loans, quotes]);

  if (!open) return null;

  const year = new Date().getFullYear();
  const reading: Tile[] = [
    { href: "/log", label: "Reading log", sub: "every session", icon: NotebookPen, ink: "var(--color-riso-pink)" },
    { href: "/stats", label: "Progress", sub: "goals, charts", icon: BarChart3, ink: "var(--color-riso-blue)" },
    { href: "/next", label: "What next?", sub: "surprise me", icon: Dice5, ink: "var(--color-riso-yellow)", light: true },
  ];
  const collection: Tile[] = [
    { href: "/authors", label: "Authors", sub: `${counts.authors} on your shelves`, icon: Users, ink: "var(--color-riso-orange)" },
    { href: "/series", label: "Series", sub: counts.gaps ? `${counts.gaps} gap${counts.gaps === 1 ? "" : "s"}` : "all complete", icon: Layers, ink: "var(--color-riso-purple)" },
    { href: "/wishlist", label: "Wishlist", sub: `${counts.wanted} wanted`, icon: Gift, ink: "var(--color-riso-pink)" },
    { href: "/lending", label: "Lending", sub: counts.out ? `${counts.out} out` : "all home", icon: HandHelping, ink: "var(--color-riso-orange)" },
    { href: "/recommendations", label: "Recommended", sub: "to & from friends", icon: MessageSquareHeart, ink: "var(--color-riso-blue)" },
    { href: "/shelf", label: "Shelf map", sub: "where it lives", icon: MapPin, ink: "var(--color-riso-yellow)", light: true },
    { href: "/quotes", label: "Quotes", sub: `${counts.quotes} lines`, icon: Quote, ink: "var(--color-riso-purple)" },
    { href: "/wrapped", label: `${year} Wrapped`, sub: "year in books", icon: Sparkles, ink: "var(--color-riso-pink)" },
    { href: "/settings", label: "Settings", sub: "goals, backup", icon: Settings, ink: "var(--color-riso-yellow)", light: true },
  ];

  const renderTile = (t: Tile) => {
    const Icon = t.icon;
    return (
      <Link
        key={t.href}
        href={t.href}
        onClick={onClose}
        className="flex min-h-[86px] flex-col items-start gap-2 rounded-2xl border-[2.5px] border-outline bg-surface p-3 pop-sm transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-outline"
          style={{ background: t.ink, color: t.light ? "#1a1430" : "#fff" }}
        >
          <Icon className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <span className="leading-tight">
          <span className="block font-display text-sm font-extrabold">{t.label}</span>
          <span className="block text-[0.7rem] font-semibold text-text-muted">{t.sub}</span>
        </span>
      </Link>
    );
  };

  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="More">
      <button aria-label="Close" className="absolute inset-0 bg-[#1a1430]/50" onClick={onClose} />
      <section className="absolute inset-x-0 bottom-[66px] max-h-[calc(100dvh-90px)] overflow-y-auto rounded-t-[22px] border-t-[2.5px] border-outline bg-bg px-4 pb-5 pt-2.5">
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-border" />
        <button
          onClick={() => {
            onClose();
            openCommand();
          }}
          className="mb-4 flex h-12 w-full items-center gap-2.5 rounded-xl border-2 border-outline bg-surface-2 px-3.5 text-sm font-semibold text-text-muted"
        >
          <Search className="h-4 w-4" /> Search books, authors, quotes…
        </button>

        <p className="mb-2 text-[0.7rem] font-extrabold uppercase tracking-widest text-text-muted">Reading</p>
        <div className="mb-4 grid grid-cols-3 gap-2.5">{reading.map(renderTile)}</div>

        <p className="mb-2 text-[0.7rem] font-extrabold uppercase tracking-widest text-text-muted">Your collection</p>
        <div className="grid grid-cols-3 gap-2.5">{collection.map(renderTile)}</div>
      </section>
    </div>
  );
}
