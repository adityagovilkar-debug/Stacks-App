"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronRight, MapPin, PackageOpen, Search, Settings, ArrowRightLeft } from "lucide-react";
import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonGrid } from "@/components/Skeleton";
import { useBooks, useLocations, useMoveBooks } from "@/lib/queries";
import { buildPathMap, locationOptions } from "@/lib/locations";
import type { Book, Location } from "@/lib/types";
import { cn } from "@/lib/utils";

const NONE = "__none";

// Where every book lives: your locations as a tree with counts, the books on
// whichever shelf you open, a "where is…?" search, and moving a whole shelf.
export default function ShelfPage() {
  const { data: books = [], isLoading } = useBooks();
  const { data: locations = [] } = useLocations();
  const move = useMoveBooks();

  const paths = useMemo(() => buildPathMap(locations), [locations]);
  const children = useMemo(() => {
    const m = new Map<string | null, Location[]>();
    for (const l of locations) {
      const k = l.parent_id && locations.some((p) => p.id === l.parent_id) ? l.parent_id : null;
      m.set(k, [...(m.get(k) ?? []), l]);
    }
    for (const list of m.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return m;
  }, [locations]);
  const direct = useMemo(() => {
    const m = new Map<string, Book[]>();
    for (const b of books) {
      const k = b.location_id && paths.has(b.location_id) ? b.location_id : NONE;
      m.set(k, [...(m.get(k) ?? []), b]);
    }
    return m;
  }, [books, paths]);

  // Total books at a location including everything nested under it.
  const totals = useMemo(() => {
    const memo = new Map<string, number>();
    const count = (id: string, depth = 0): number => {
      if (memo.has(id)) return memo.get(id)!;
      let n = direct.get(id)?.length ?? 0;
      if (depth < 30) for (const c of children.get(id) ?? []) n += count(c.id, depth + 1);
      memo.set(id, n);
      return n;
    };
    for (const l of locations) count(l.id);
    return memo;
  }, [locations, children, direct]);

  const [open, setOpen] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [nested, setNested] = useState(true);
  const [q, setQ] = useState("");
  const [moveTo, setMoveTo] = useState("");

  const descendants = (id: string): string[] => {
    const out: string[] = [];
    const walk = (x: string, depth = 0) => {
      if (depth > 30) return;
      for (const c of children.get(x) ?? []) {
        out.push(c.id);
        walk(c.id, depth + 1);
      }
    };
    walk(id);
    return out;
  };

  const shown: Book[] = useMemo(() => {
    if (!selected) return [];
    if (selected === NONE) return direct.get(NONE) ?? [];
    const ids = [selected, ...(nested ? descendants(selected) : [])];
    return ids.flatMap((id) => direct.get(id) ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, nested, direct, children]);

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return books
      .filter((b) => [b.title, ...(b.authors ?? [])].join(" ").toLowerCase().includes(needle))
      .slice(0, 12);
  }, [books, q]);

  function moveAll() {
    if (!shown.length) return;
    const target = moveTo === NONE ? null : moveTo;
    const label = target ? paths.get(target) : "Not shelved";
    move.mutate(
      { ids: shown.map((b) => b.id), locationId: target },
      {
        onSuccess: () => {
          toast.success(`Moved ${shown.length} book${shown.length === 1 ? "" : "s"} to ${label}`);
          setMoveTo("");
        },
      },
    );
  }

  const renderNode = (loc: Location, depth: number): React.ReactNode => {
    const kids = children.get(loc.id) ?? [];
    const isOpen = open.has(loc.id);
    return (
      <li key={loc.id}>
        <div
          className={cn(
            "flex items-center gap-1 rounded-lg pr-2",
            selected === loc.id ? "bg-riso-yellow text-[#1a1430]" : "hover:bg-surface-2",
          )}
          style={{ paddingLeft: depth * 16 }}
        >
          <button
            aria-label={isOpen ? `Collapse ${loc.name}` : `Expand ${loc.name}`}
            disabled={!kids.length}
            onClick={() =>
              setOpen((s) => {
                const n = new Set(s);
                if (n.has(loc.id)) n.delete(loc.id);
                else n.add(loc.id);
                return n;
              })
            }
            className={cn("flex h-9 w-8 items-center justify-center", !kids.length && "opacity-0")}
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
          </button>
          <button className="flex min-h-9 flex-1 items-center gap-2 text-left text-sm font-bold" onClick={() => setSelected(loc.id)}>
            {loc.name}
          </button>
          <span className="text-xs font-bold text-text-muted">{totals.get(loc.id) ?? 0}</span>
        </div>
        {isOpen && kids.length > 0 && (
          <ul>
            {kids.map((k) => (
              renderNode(k, depth + 1)
            ))}
          </ul>
        )}
      </li>
    );
  }

  const roots = children.get(null) ?? [];
  const unshelved = direct.get(NONE)?.length ?? 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold misreg">Shelf map</h1>
          <p className="mt-1 text-text-muted">Where every book lives in your home.</p>
        </div>
        <Link href="/settings" className="btn-outline">
          <Settings className="h-5 w-5" /> Edit locations
        </Link>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
        <input
          className="input pl-10"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Where is… (title or author)"
        />
      </div>
      {hits.length > 0 && (
        <ul className="card-soft divide-y-2 divide-border p-2">
          {hits.map((b) => (
            <li key={b.id} className="flex items-center gap-3 py-2">
              <Link href={`/book/${b.id}`} className="w-7 shrink-0">
                <BookCover title={b.title} authors={b.authors} coverUrl={b.cover_url} />
              </Link>
              <Link href={`/book/${b.id}`} className="min-w-0 flex-1 truncate text-sm font-bold hover:underline">
                {b.title}
              </Link>
              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-riso-blue">
                <MapPin className="h-3.5 w-3.5" />
                {b.location_id && paths.get(b.location_id) ? paths.get(b.location_id) : "Not shelved"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {isLoading ? (
        <SkeletonGrid count={8} />
      ) : books.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No books to place yet"
          hint="Add books and give each a location to see your shelf map."
          action={
            <Link href="/add" className="btn-primary">
              Add a book
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Tree */}
          <nav aria-label="Locations" className="card p-3">
            <ul>
              {roots.map((l) => (
                renderNode(l, 0)
              ))}
              <li>
                <div
                  className={cn(
                    "flex items-center gap-1 rounded-lg pr-2",
                    selected === NONE ? "bg-riso-yellow text-[#1a1430]" : "hover:bg-surface-2",
                  )}
                >
                  <span className="w-8" />
                  <button className="flex min-h-9 flex-1 items-center text-left text-sm font-bold italic" onClick={() => setSelected(NONE)}>
                    Not shelved yet
                  </button>
                  <span className="text-xs font-bold text-text-muted">{unshelved}</span>
                </div>
              </li>
            </ul>
            {!locations.length && (
              <p className="mt-2 text-xs text-text-muted">
                No locations yet — add rooms and shelves in Settings.
              </p>
            )}
          </nav>

          {/* Selected shelf */}
          <section>
            {!selected ? (
              <p className="card-soft p-4 text-sm text-text-muted">
                Pick a room or shelf to see what&apos;s on it.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
                    <MapPin className="h-5 w-5 text-riso-orange" />
                    {selected === NONE ? "Not shelved yet" : paths.get(selected)}
                    <span className="chip bg-surface-2">{shown.length}</span>
                  </h2>
                  {selected !== NONE && (children.get(selected)?.length ?? 0) > 0 && (
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-riso-blue"
                        checked={nested}
                        onChange={(e) => setNested(e.target.checked)}
                      />
                      Include shelves inside it
                    </label>
                  )}
                </div>

                {shown.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-outline bg-surface-2 p-2.5">
                    <ArrowRightLeft className="h-4 w-4 text-text-muted" />
                    <span className="text-sm font-bold">Move all {shown.length} to</span>
                    <select
                      className="select h-10 min-h-0 w-auto flex-1 py-1 text-sm"
                      value={moveTo}
                      onChange={(e) => setMoveTo(e.target.value)}
                      aria-label="Move to"
                    >
                      <option value="">— choose —</option>
                      {locationOptions(locations)
                        .filter((o) => o.id !== selected)
                        .map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      {selected !== NONE && <option value={NONE}>Not shelved</option>}
                    </select>
                    <button className="btn-primary h-10 min-h-0" disabled={!moveTo || move.isPending} onClick={moveAll}>
                      Move
                    </button>
                  </div>
                )}

                {shown.length === 0 ? (
                  <p className="text-sm text-text-muted">Nothing here.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">
                    {shown.map((b) => (
                      <Link key={b.id} href={`/book/${b.id}`} title={b.title} className="group">
                        <BookCover
                          title={b.title}
                          authors={b.authors}
                          coverUrl={b.cover_url}
                          className="transition-transform group-hover:-translate-y-1"
                        />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
