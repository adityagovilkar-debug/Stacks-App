"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Gift, PackageCheck, Plus } from "lucide-react";
import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { useBooks, useLocations, usePatchBook, useRecommendations } from "@/lib/queries";
import { locationOptions } from "@/lib/locations";
import { todayISO } from "@/lib/stats";
import type { Book } from "@/lib/types";

// Books you want. "Found it" turns an entry into a book on your shelf,
// keeping its tags, notes, quotes and recommendations.
export default function WishlistPage() {
  const { data: books = [], isLoading } = useBooks();
  const { data: recs = [] } = useRecommendations();
  const wanted = useMemo(
    () =>
      books
        .filter((b) => b.ownership === "wishlist")
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [books],
  );
  const recBy = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of recs)
      if (r.direction === "from") m.set(r.book_id, [...(m.get(r.book_id) ?? []), r.person]);
    return m;
  }, [recs]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold misreg">Wishlist</h1>
          <p className="mt-1 text-text-muted">
            {wanted.length} book{wanted.length === 1 ? "" : "s"} you&apos;d like on your shelves.
          </p>
        </div>
        <Link href="/add?wish=1" className="btn-primary">
          <Plus className="h-5 w-5" /> Add to wishlist
        </Link>
      </header>

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : wanted.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="Your wishlist is empty"
          hint="Add a book with ownership set to Wishlist, or tap a missing volume on the Series page."
        />
      ) : (
        <ul className="space-y-3">
          {wanted.map((b) => (
            <WishRow key={b.id} book={b} recommendedBy={recBy.get(b.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function WishRow({ book, recommendedBy }: { book: Book; recommendedBy?: string[] }) {
  const patch = usePatchBook();
  const { data: locations = [] } = useLocations();
  const [finding, setFinding] = useState(false);
  const [locationId, setLocationId] = useState("");

  function found() {
    patch.mutate(
      {
        id: book.id,
        patch: {
          ownership: "owned",
          acquired_on: todayISO(),
          ...(locationId ? { location_id: locationId } : {}),
        },
      },
      { onSuccess: () => toast.success(`“${book.title}” is on your shelf 🎉`) },
    );
  }

  return (
    <li className="card flex flex-wrap items-center gap-3 p-3">
      <Link href={`/book/${book.id}`} className="w-10 shrink-0">
        <BookCover title={book.title} authors={book.authors} coverUrl={book.cover_url} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/book/${book.id}`} className="block font-display text-sm font-bold hover:underline">
          {book.title}
        </Link>
        <p className="truncate text-xs text-text-muted">
          {book.authors.join(", ")}
          {book.series_name ? ` · ${book.series_name}${book.series_index != null ? ` #${book.series_index}` : ""}` : ""}
          {recommendedBy?.length ? ` · recommended by ${recommendedBy.join(", ")}` : ""}
        </p>
      </div>
      {finding ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <select
            className="select h-10 min-h-0 w-auto py-1 text-sm"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            aria-label="Where will it live"
          >
            <option value="">Shelve it later</option>
            {locationOptions(locations).map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <button className="btn-primary h-10 min-h-0" onClick={found} disabled={patch.isPending}>
            Got it
          </button>
          <button className="btn-ghost h-10 min-h-0" onClick={() => setFinding(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button className="btn-outline shrink-0" onClick={() => setFinding(true)}>
          <PackageCheck className="h-5 w-5" /> Found it
        </button>
      )}
    </li>
  );
}
