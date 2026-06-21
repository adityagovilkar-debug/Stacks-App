"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X, BookPlus, Heart } from "lucide-react";
import { BookCard } from "@/components/BookCard";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonGrid } from "@/components/Skeleton";
import { DuplicatesNotice } from "@/components/DuplicatesNotice";
import {
  useBooks,
  useCollections,
  useLocations,
  useTags,
} from "@/lib/queries";
import { locationOptions } from "@/lib/locations";
import {
  FORMAT_LABEL,
  OWNERSHIP_LABEL,
  READ_STATUS_LABEL,
  TAG_KIND_LABEL,
  palette,
  type BookFormat,
  type Ownership,
  type ReadStatus,
  type TagKind,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Sort = "added" | "title" | "author" | "rating" | "year" | "pages";

const SORTS: { key: Sort; label: string }[] = [
  { key: "added", label: "Recently added" },
  { key: "title", label: "Title A–Z" },
  { key: "author", label: "Author A–Z" },
  { key: "rating", label: "Highest rated" },
  { key: "year", label: "Newest published" },
  { key: "pages", label: "Longest" },
];

function toggle<T>(set: Set<T>, v: T): Set<T> {
  const next = new Set(set);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<SkeletonGrid count={10} />}>
      <LibraryInner />
    </Suspense>
  );
}

function LibraryInner() {
  const params = useSearchParams();
  const { data: books = [], isLoading } = useBooks();
  const { data: tags = [] } = useTags();
  const { data: collections = [] } = useCollections();
  const { data: locations = [] } = useLocations();

  const [q, setQ] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<Sort>("added");

  const [status, setStatus] = useState<Set<ReadStatus>>(
    new Set(params.get("status") ? [params.get("status") as ReadStatus] : []),
  );
  const [ownership, setOwnership] = useState<Set<Ownership>>(new Set());
  const [formats, setFormats] = useState<Set<BookFormat>>(new Set());
  const [tagIds, setTagIds] = useState<Set<string>>(
    new Set(params.get("tag") ? [params.get("tag")!] : []),
  );
  const [collectionId, setCollectionId] = useState(params.get("collection") ?? "");
  const [locationId, setLocationId] = useState(params.get("location") ?? "");
  const [favOnly, setFavOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = books.filter((b) => {
      if (needle) {
        const hay = [b.title, b.subtitle, b.series_name, ...(b.authors ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (status.size && !status.has(b.read_status)) return false;
      if (ownership.size && !ownership.has(b.ownership)) return false;
      if (formats.size && (!b.format || !formats.has(b.format))) return false;
      if (tagIds.size) {
        const have = new Set((b.tags ?? []).map((t) => t.id));
        for (const id of tagIds) if (!have.has(id)) return false;
      }
      if (collectionId && !(b.collection_ids ?? []).includes(collectionId)) return false;
      if (locationId && b.location_id !== locationId) return false;
      if (favOnly && !b.favorite) return false;
      if (minRating && (b.rating ?? 0) < minRating) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "title":
          return a.title.localeCompare(b.title);
        case "author":
          return (a.authors[0] ?? "").localeCompare(b.authors[0] ?? "");
        case "rating":
          return (b.rating ?? -1) - (a.rating ?? -1);
        case "year":
          return (b.published_year ?? 0) - (a.published_year ?? 0);
        case "pages":
          return (b.page_count ?? 0) - (a.page_count ?? 0);
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });
    return list;
  }, [books, q, status, ownership, formats, tagIds, collectionId, locationId, favOnly, minRating, sort]);

  const activeCount =
    status.size +
    ownership.size +
    formats.size +
    tagIds.size +
    (collectionId ? 1 : 0) +
    (locationId ? 1 : 0) +
    (favOnly ? 1 : 0) +
    (minRating ? 1 : 0);

  function clearAll() {
    setStatus(new Set());
    setOwnership(new Set());
    setFormats(new Set());
    setTagIds(new Set());
    setCollectionId("");
    setLocationId("");
    setFavOnly(false);
    setMinRating(0);
  }

  const kinds: TagKind[] = ["genre", "mood", "theme", "tag"];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold misreg">Library</h1>
          <p className="mt-1 text-text-muted">
            {books.length} {books.length === 1 ? "book" : "books"}
            {activeCount > 0 && ` · ${filtered.length} match`}
          </p>
        </div>
        <Link href="/add" className="btn-primary">
          <BookPlus className="h-5 w-5" /> Add
        </Link>
      </header>

      {!isLoading && <DuplicatesNotice books={books} />}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
          <input
            className="input pl-10"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, author, series…"
          />
        </div>
        <select
          className="select w-auto"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          className={cn("btn-outline", activeCount > 0 && "bg-riso-yellow text-[#1a1430]")}
          onClick={() => setShowFilters((s) => !s)}
        >
          <SlidersHorizontal className="h-5 w-5" />
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card-soft space-y-4 p-4">
          <FacetRow label="Status">
            {(Object.keys(READ_STATUS_LABEL) as ReadStatus[]).map((s) => (
              <Chip key={s} on={status.has(s)} onClick={() => setStatus(toggle(status, s))}>
                {READ_STATUS_LABEL[s]}
              </Chip>
            ))}
          </FacetRow>

          <FacetRow label="Ownership">
            {(Object.keys(OWNERSHIP_LABEL) as Ownership[]).map((o) => (
              <Chip key={o} on={ownership.has(o)} onClick={() => setOwnership(toggle(ownership, o))}>
                {OWNERSHIP_LABEL[o]}
              </Chip>
            ))}
          </FacetRow>

          <FacetRow label="Format">
            {(Object.keys(FORMAT_LABEL) as BookFormat[]).map((f) => (
              <Chip key={f} on={formats.has(f)} onClick={() => setFormats(toggle(formats, f))}>
                {FORMAT_LABEL[f]}
              </Chip>
            ))}
          </FacetRow>

          {kinds.map((kind) => {
            const group = tags.filter((t) => t.kind === kind);
            if (!group.length) return null;
            return (
              <FacetRow key={kind} label={TAG_KIND_LABEL[kind]}>
                {group.map((t) => {
                  const p = palette(t.color);
                  return (
                    <Chip
                      key={t.id}
                      on={tagIds.has(t.id)}
                      onClick={() => setTagIds(toggle(tagIds, t.id))}
                      className={tagIds.has(t.id) ? p.chip : ""}
                    >
                      <span className={cn("h-2 w-2 rounded-full", p.dot)} /> {t.name}
                    </Chip>
                  );
                })}
              </FacetRow>
            );
          })}

          <div className="grid gap-3 sm:grid-cols-2">
            {collections.length > 0 && (
              <div>
                <div className="label">Collection</div>
                <select className="select" value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
                  <option value="">Any</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            {locations.length > 0 && (
              <div>
                <div className="label">Location</div>
                <select className="select" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                  <option value="">Anywhere</option>
                  {locationOptions(locations).map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Chip on={favOnly} onClick={() => setFavOnly((f) => !f)}>
              <Heart className={cn("h-3.5 w-3.5", favOnly && "fill-current")} /> Favorites
            </Chip>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text-muted">Min rating</span>
              {[0, 3, 4, 4.5].map((r) => (
                <Chip key={r} on={minRating === r} onClick={() => setMinRating(r)}>
                  {r === 0 ? "Any" : `${r}★`}
                </Chip>
              ))}
            </div>
            {activeCount > 0 && (
              <button className="ml-auto chip border-dashed text-text-muted" onClick={clearAll}>
                <X className="h-3.5 w-3.5" /> Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <SkeletonGrid count={10} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookPlus}
          title={books.length === 0 ? "Your shelves are empty" : "No books match"}
          hint={
            books.length === 0
              ? "Scan a barcode or add your first book to get started."
              : "Try clearing some filters."
          }
          action={
            books.length === 0 ? (
              <Link href="/add" className="btn-primary">
                <BookPlus className="h-5 w-5" /> Add a book
              </Link>
            ) : (
              <button className="btn-outline" onClick={clearAll}>
                Clear filters
              </button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {filtered.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function FacetRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
  className,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "chip transition",
        on ? "bg-riso-blue/15" : "opacity-60 hover:opacity-100",
        className,
      )}
    >
      {children}
    </button>
  );
}
