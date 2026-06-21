"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Library,
  ScanLine,
  ListChecks,
  NotebookPen,
  BarChart3,
  MapPin,
  Settings,
  BookOpen,
  Quote,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LogSessionDialog } from "./LogSessionDialog";
import { EditBookDialog } from "./EditBookDialog";
import {
  EDIT_BOOK_EVENT,
  LOG_SESSION_EVENT,
  openLogSession,
  type EditBookDetail,
  type LogSessionDetail,
} from "@/lib/events";
import { useProfile, useUpdateProfile } from "@/lib/queries";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import type { Book } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
  mobile?: boolean;
}
const NAV: NavItem[] = [
  { href: "/", label: "Home", short: "Home", icon: Home, mobile: true },
  { href: "/library", label: "Library", short: "Library", icon: Library, mobile: true },
  { href: "/add", label: "Add a book", short: "Add", icon: ScanLine, mobile: true },
  { href: "/queue", label: "Reading queue", short: "Queue", icon: ListChecks, mobile: true },
  { href: "/log", label: "Reading log", short: "Log", icon: NotebookPen },
  { href: "/stats", label: "Progress", short: "Stats", icon: BarChart3, mobile: true },
  { href: "/wrapped", label: "Year in review", short: "Wrapped", icon: Sparkles },
  { href: "/quotes", label: "Commonplace book", short: "Quotes", icon: Quote },
  { href: "/shelf", label: "Shelf map", short: "Shelf", icon: MapPin },
  { href: "/settings", label: "Settings", short: "Settings", icon: Settings },
];
const MOBILE_NAV = NAV.filter((n) => n.mobile);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const [logOpen, setLogOpen] = useState(false);
  const [logBook, setLogBook] = useState<LogSessionDetail["book"]>(undefined);
  const [editOpen, setEditOpen] = useState(false);
  const [editBook, setEditBook] = useState<Book | undefined>(undefined);

  useEffect(() => {
    function onLog(e: Event) {
      setLogBook((e as CustomEvent<LogSessionDetail>).detail?.book);
      setLogOpen(true);
    }
    function onEdit(e: Event) {
      setEditBook((e as CustomEvent<EditBookDetail>).detail?.book);
      setEditOpen(true);
    }
    window.addEventListener(LOG_SESSION_EVENT, onLog);
    window.addEventListener(EDIT_BOOK_EVENT, onEdit);
    return () => {
      window.removeEventListener(LOG_SESSION_EVENT, onLog);
      window.removeEventListener(EDIT_BOOK_EVENT, onEdit);
    };
  }, []);

  // Keep timezone fresh (used by "today" in stats / streaks).
  useEffect(() => {
    if (!profile) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== profile.timezone) updateProfile.mutate({ timezone: tz });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 border-r-[2.5px] border-outline bg-surface px-3 py-5 lg:flex">
        <Link href="/" className="mb-4 flex items-center gap-2 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon.svg" alt="" className="h-9 w-9 rounded-lg border-2 border-outline" />
          <span className="font-display text-2xl font-extrabold tracking-tight misreg">
            {APP_NAME}
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map((n) => {
            const active = isActive(n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-base font-bold transition",
                  active
                    ? "border-2 border-outline bg-riso-yellow text-[#1a1430] pop-sm"
                    : "border-2 border-transparent text-text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2.5} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <button onClick={() => openLogSession()} className="btn-primary mt-2 w-full">
          <BookOpen className="h-5 w-5" /> Log reading
        </button>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b-[2.5px] border-outline bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon.svg" alt="" className="h-8 w-8 rounded-lg border-2 border-outline" />
            <span className="font-display text-xl font-extrabold tracking-tight">
              {APP_NAME}
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/shelf"
              aria-label="Shelf map"
              className="rounded-lg p-2 text-text-muted hover:bg-surface-2 hover:text-text"
            >
              <MapPin className="h-5 w-5" />
            </Link>
            <Link
              href="/settings"
              aria-label="Settings"
              className="rounded-lg p-2 text-text-muted hover:bg-surface-2 hover:text-text"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile FAB — log reading */}
      <button
        onClick={() => openLogSession()}
        aria-label="Log reading"
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full border-[2.5px] border-outline bg-riso-pink text-white pop transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none lg:hidden"
      >
        <BookOpen className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-[2.5px] border-outline bg-surface/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {MOBILE_NAV.map((n) => {
            const active = isActive(n.href);
            const Icon = n.icon;
            const isAdd = n.href === "/add";
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 py-2.5 text-[0.65rem] font-bold transition",
                  active ? "text-riso-blue" : "text-text-muted",
                )}
              >
                {active && !isAdd && (
                  <span className="absolute top-0 h-1 w-8 rounded-full bg-riso-blue" />
                )}
                {isAdd ? (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-outline bg-riso-blue text-white pop-sm">
                    <Icon className="h-5 w-5" strokeWidth={2.5} />
                  </span>
                ) : (
                  <Icon className="h-5 w-5" strokeWidth={2.5} />
                )}
                {n.short}
              </Link>
            );
          })}
        </div>
      </nav>

      <LogSessionDialog
        open={logOpen}
        initialBook={logBook}
        onClose={() => setLogOpen(false)}
      />
      <EditBookDialog
        open={editOpen}
        book={editBook}
        onClose={() => setEditOpen(false)}
      />
    </div>
  );
}
