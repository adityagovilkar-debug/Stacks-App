"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { todayISO } from "@/lib/stats";
import { uniqueAuthors } from "@/lib/utils";
import type {
  Book,
  BookNote,
  BookInput,
  Collection,
  Loan,
  LoanInput,
  Location,
  Profile,
  Quote,
  QuoteInput,
  ReadStatus,
  ReadThrough,
  ReadThroughInput,
  ReadingSession,
  Recommendation,
  SavedView,
  SessionInput,
  Tag,
  ViewQuery,
} from "@/lib/types";

const sb = supabaseBrowser;

// The signed-in user's id, read from the locally cached session (no network
// round trip per write; row-level security still checks it on the server).
async function uid(): Promise<string> {
  const {
    data: { session },
  } = await sb().auth.getSession();
  if (session?.user?.id) return session.user.id;
  const {
    data: { user },
  } = await sb().auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

// Supabase returns at most 1,000 rows per request. Page through until the
// table is exhausted so big libraries never silently lose rows. `make` must
// build a fresh, deterministically ordered query each call.
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchAll<T>(make: () => any): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await make().range(from, from + size - 1);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < size) break;
  }
  return out;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Open Library serves a blank 1×1 image when it has no cover. Asking with
// ?default=false makes it 404 instead, so our riso placeholder shows.
export function fixCoverUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes("covers.openlibrary.org") && !url.includes("default=false"))
    return url + (url.includes("?") ? "&" : "?") + "default=false";
  return url;
}

// =====================================================================
// Profile
// =====================================================================
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await sb().from("profiles").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const id = await uid();
      const { error } = await sb().from("profiles").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

// =====================================================================
// Locations
// =====================================================================
export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async (): Promise<Location[]> => {
      const { data, error } = await sb()
        .from("locations")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (l: { id?: string; name: string; parent_id: string | null }) => {
      const user_id = await uid();
      if (l.id) {
        const { error } = await sb()
          .from("locations")
          .update({ name: l.name, parent_id: l.parent_id })
          .eq("id", l.id);
        if (error) throw error;
      } else {
        const { error } = await sb()
          .from("locations")
          .insert({ user_id, name: l.name, parent_id: l.parent_id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      qc.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

// =====================================================================
// Tags
// =====================================================================
export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async (): Promise<Tag[]> => {
      const { data, error } = await sb()
        .from("tags")
        .select("*")
        .order("kind", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Partial<Tag> & { name: string }) => {
      const user_id = await uid();
      if (t.id) {
        const { error } = await sb()
          .from("tags")
          .update({ name: t.name, kind: t.kind, color: t.color })
          .eq("id", t.id);
        if (error) throw error;
        return t.id;
      }
      const { data, error } = await sb()
        .from("tags")
        .insert({
          user_id,
          name: t.name,
          kind: t.kind ?? "tag",
          color: t.color ?? "slate",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

// =====================================================================
// Collections
// =====================================================================
export function useCollections() {
  return useQuery({
    queryKey: ["collections"],
    queryFn: async (): Promise<Collection[]> => {
      const { data, error } = await sb()
        .from("collections")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Partial<Collection> & { name: string }) => {
      const user_id = await uid();
      if (c.id) {
        const { error } = await sb()
          .from("collections")
          .update({ name: c.name, description: c.description, color: c.color })
          .eq("id", c.id);
        if (error) throw error;
      } else {
        const { data: last } = await sb()
          .from("collections")
          .select("sort_order")
          .order("sort_order", { ascending: false })
          .limit(1)
          .maybeSingle();
        const { error } = await sb().from("collections").insert({
          user_id,
          name: c.name,
          description: c.description ?? null,
          color: c.color ?? "blue",
          sort_order: (last?.sort_order ?? -1) + 1,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections"] }),
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("collections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collections"] });
      qc.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

// =====================================================================
// Books
// =====================================================================
const BOOK_SELECT =
  "*, book_tags(tag:tags(*)), collection_books(collection_id), location:locations(*)";

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapBook(row: any): Book {
  return {
    ...row,
    authors: uniqueAuthors(row.authors),
    cover_url: fixCoverUrl(row.cover_url),
    archived_at: row.archived_at ?? null,
    tags: (row.book_tags ?? []).map((bt: any) => bt.tag).filter(Boolean),
    collection_ids: (row.collection_books ?? []).map((cb: any) => cb.collection_id),
    location: row.location ?? null,
  } as Book;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function fetchAllBooks(): Promise<Book[]> {
  const rows = await fetchAll<unknown>(() =>
    sb()
      .from("books")
      .select(BOOK_SELECT)
      .order("created_at", { ascending: false })
      .order("id"),
  );
  return rows.map(mapBook);
}

// The library — everything not removed. (Filtered here rather than in SQL so
// the app keeps working before migration 0008 adds archived_at.)
export function useBooks() {
  return useQuery({
    queryKey: ["books"],
    queryFn: async (): Promise<Book[]> =>
      (await fetchAllBooks()).filter((b) => !b.archived_at),
  });
}

// Books removed from the library (history kept) — for Settings.
export function useArchivedBooks() {
  return useQuery({
    queryKey: ["books", "archived"],
    queryFn: async (): Promise<Book[]> =>
      (await fetchAllBooks()).filter((b) => !!b.archived_at),
  });
}

export function useBook(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ["book", id],
    queryFn: async (): Promise<Book | null> => {
      const { data, error } = await sb()
        .from("books")
        .select(BOOK_SELECT)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data ? mapBook(data) : null;
    },
  });
}

// Split BookInput into the plain `books` columns + the two id arrays.
function splitInput(input: BookInput) {
  const { tag_ids, collection_ids, ...cols } = input;
  return { cols: { ...cols, authors: uniqueAuthors(cols.authors) }, tag_ids, collection_ids };
}

async function setBookTags(book_id: string, user_id: string, tagIds: string[]) {
  const { data: existing } = await sb()
    .from("book_tags")
    .select("tag_id")
    .eq("book_id", book_id);
  const have = new Set((existing ?? []).map((r: { tag_id: string }) => r.tag_id));
  const want = new Set(tagIds);
  const toAdd = tagIds.filter((id) => !have.has(id));
  const toRemove = [...have].filter((id) => !want.has(id));
  if (toAdd.length) {
    const { error } = await sb()
      .from("book_tags")
      .insert(toAdd.map((tag_id) => ({ book_id, tag_id, user_id })));
    if (error) throw error;
  }
  if (toRemove.length) {
    const { error } = await sb()
      .from("book_tags")
      .delete()
      .eq("book_id", book_id)
      .in("tag_id", toRemove);
    if (error) throw error;
  }
}

async function setBookCollections(book_id: string, user_id: string, ids: string[]) {
  const { data: existing } = await sb()
    .from("collection_books")
    .select("collection_id")
    .eq("book_id", book_id);
  const have = new Set(
    (existing ?? []).map((r: { collection_id: string }) => r.collection_id),
  );
  const want = new Set(ids);
  const toAdd = ids.filter((id) => !have.has(id));
  const toRemove = [...have].filter((id) => !want.has(id));
  if (toAdd.length) {
    const { error } = await sb()
      .from("collection_books")
      .insert(toAdd.map((collection_id) => ({ collection_id, book_id, user_id })));
    if (error) throw error;
  }
  if (toRemove.length) {
    const { error } = await sb()
      .from("collection_books")
      .delete()
      .eq("book_id", book_id)
      .in("collection_id", toRemove);
    if (error) throw error;
  }
}

function invalidateBooks(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: ["books"] });
  qc.invalidateQueries({ queryKey: ["all-read-throughs"] });
  if (id) {
    qc.invalidateQueries({ queryKey: ["book", id] });
    qc.invalidateQueries({ queryKey: ["read-throughs", id] });
  }
}

// ---------------------------------------------------------------------
// Read-throughs are the source of truth for "I read this". The book's own
// rating / review / finished_on / times_read are a summary of them: the
// latest read wins (falling back to the most recent read that has a rating
// or review, so an unrated re-read doesn't blank the book).
// ---------------------------------------------------------------------
type ReadRow = Pick<ReadThrough, "id" | "finished_on" | "rating" | "review" | "created_at">;

function sortReads<T extends ReadRow>(reads: T[]): T[] {
  return [...reads].sort((a, b) => {
    if (a.finished_on && b.finished_on && a.finished_on !== b.finished_on)
      return b.finished_on.localeCompare(a.finished_on);
    if (!!a.finished_on !== !!b.finished_on) return a.finished_on ? -1 : 1; // unknown dates last
    return b.created_at.localeCompare(a.created_at);
  });
}

async function bookReads(bookId: string): Promise<ReadRow[]> {
  const { data } = await sb()
    .from("read_throughs")
    .select("id, finished_on, rating, review, created_at")
    .eq("book_id", bookId);
  return sortReads((data ?? []) as ReadRow[]);
}

async function syncSummary(bookId: string) {
  const reads = await bookReads(bookId);
  const patch: Record<string, unknown> = { times_read: reads.length };
  if (reads.length) {
    patch.finished_on = reads[0].finished_on;
    patch.rating = reads.find((r) => r.rating != null && r.rating > 0)?.rating ?? null;
    patch.review = reads.find((r) => r.review)?.review ?? null;
  }
  await sb().from("books").update(patch).eq("id", bookId);
}

async function recordRead(
  bookId: string,
  read: {
    started_on: string | null;
    finished_on: string | null;
    rating: number | null;
    review: string | null;
  },
) {
  const user_id = await uid();
  const { error } = await sb()
    .from("read_throughs")
    .insert({ user_id, book_id: bookId, ...read });
  if (error) throw error;
  await sb().from("books").update({ queue_position: null }).eq("id", bookId);
  await syncSummary(bookId);
}

export function useAddBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BookInput) => {
      const user_id = await uid();
      const { cols, tag_ids, collection_ids } = splitInput(input);
      if (cols.read_status === "reading" && !cols.started_on) cols.started_on = todayISO();
      const { data, error } = await sb()
        .from("books")
        .insert({ ...cols, user_id })
        .select("id")
        .single();
      if (error) throw error;
      const book_id = data.id as string;
      if (tag_ids.length) await setBookTags(book_id, user_id, tag_ids);
      if (collection_ids.length)
        await setBookCollections(book_id, user_id, collection_ids);
      // Added as already read → record that read (an empty finish date means
      // "don't remember when", so it won't count toward this year).
      if (cols.read_status === "read") {
        await recordRead(book_id, {
          started_on: cols.started_on,
          finished_on: cols.finished_on,
          rating: cols.rating,
          review: cols.review,
        });
      }
      return book_id;
    },
    onSuccess: () => invalidateBooks(qc),
  });
}

export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: BookInput }) => {
      const user_id = await uid();
      const { data: before } = await sb()
        .from("books")
        .select("read_status")
        .eq("id", id)
        .maybeSingle();
      const { cols, tag_ids, collection_ids } = splitInput(input);
      const { error } = await sb().from("books").update(cols).eq("id", id);
      if (error) throw error;
      await setBookTags(id, user_id, tag_ids);
      await setBookCollections(id, user_id, collection_ids);

      if (cols.read_status === "read") {
        const reads = await bookReads(id);
        if (before?.read_status !== "read" || !reads.length) {
          await recordRead(id, {
            started_on: cols.started_on,
            finished_on: cols.finished_on,
            rating: cols.rating,
            review: cols.review,
          });
        } else {
          // Dates / rating / review edited in the form belong to the latest read.
          await sb()
            .from("read_throughs")
            .update({
              started_on: cols.started_on,
              finished_on: cols.finished_on,
              rating: cols.rating,
              review: cols.review,
            })
            .eq("id", reads[0].id);
          await syncSummary(id);
        }
      }
    },
    onSuccess: (_d, v) => invalidateBooks(qc, v.id),
  });
}

// "Remove from library": hide the book, keep every bit of its history.
export function useArchiveBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb()
        .from("books")
        .update({ archived_at: new Date().toISOString(), queue_position: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => invalidateBooks(qc, id),
  });
}

export function useRestoreBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("books").update({ archived_at: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => invalidateBooks(qc, id),
  });
}

// Delete forever — also deletes its sessions, reads, quotes and loans.
export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateBooks(qc);
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["loans"] });
    },
  });
}

// Patch a few book columns directly (rating, favorite, bookmark, review…).
// Rating and review on a book you've read belong to its latest read, so those
// are written there and the book's summary is refreshed from it.
export function usePatchBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Book> }) => {
      const { rating, review, ...rest } = patch;
      const touchesRead = "rating" in patch || "review" in patch;
      if (touchesRead) {
        const { data: b } = await sb()
          .from("books")
          .select("read_status")
          .eq("id", id)
          .maybeSingle();
        const reads = b?.read_status === "read" ? await bookReads(id) : [];
        if (reads.length) {
          const readPatch: Record<string, unknown> = {};
          if ("rating" in patch) readPatch.rating = rating;
          if ("review" in patch) readPatch.review = review;
          const { error } = await sb()
            .from("read_throughs")
            .update(readPatch)
            .eq("id", reads[0].id);
          if (error) throw error;
          await syncSummary(id);
        } else {
          const direct: Record<string, unknown> = {};
          if ("rating" in patch) direct.rating = rating;
          if ("review" in patch) direct.review = review;
          const { error } = await sb().from("books").update(direct).eq("id", id);
          if (error) throw error;
        }
      }
      if (Object.keys(rest).length) {
        const { error } = await sb().from("books").update(rest).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => invalidateBooks(qc, v.id),
  });
}

// Change read status with the sensible side-effects.
export function useSetReadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      book,
      status,
      finishedOn,
      rating,
      review,
    }: {
      book: Book;
      status: ReadStatus;
      finishedOn?: string | null; // when marking Read; defaults to today
      rating?: number | null; // from the finish sheet: this read's own rating
      review?: string | null; // … and its own line of review
    }) => {
      if (status === book.read_status) return;
      const patch: Partial<Book> = { read_status: status };
      const today = todayISO();
      if (status === "reading" && !book.started_on) patch.started_on = today;
      // A book you gave up on shouldn't linger in the to-read queue.
      if (status === "abandoned") patch.queue_position = null;
      const { error } = await sb().from("books").update(patch).eq("id", book.id);
      if (error) throw error;

      // Finishing a book = a new read-through. The first read carries any
      // rating/review you gave while reading; a re-read starts unrated.
      if (status === "read") {
        const first = book.times_read < 1;
        await recordRead(book.id, {
          started_on: book.started_on,
          finished_on: finishedOn === undefined ? today : finishedOn,
          rating: rating !== undefined ? rating : first ? book.rating : null,
          review: review !== undefined ? review : first ? book.review : null,
        });
      }
    },
    onSuccess: (_d, v) => invalidateBooks(qc, v.book.id),
  });
}

// Start re-reading a book you've finished: back to Reading with a fresh
// bookmark. The new read-through is recorded when you finish it.
export function useReadAgain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (book: Book) => {
      const { error } = await sb()
        .from("books")
        .update({
          read_status: "reading",
          started_on: todayISO(),
          current_page: null,
          audio_position_minutes: null,
          current_location: null,
          queue_position: null,
        })
        .eq("id", book.id);
      if (error) throw error;
    },
    onSuccess: (_d, b) => invalidateBooks(qc, b.id),
  });
}

// =====================================================================
// Reading queue (queue_position; null = not queued)
// =====================================================================
export function useAddToQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (book: Book) => {
      const { data: last } = await sb()
        .from("books")
        .select("queue_position")
        .not("queue_position", "is", null)
        .order("queue_position", { ascending: false })
        .limit(1)
        .maybeSingle();
      const next = (last?.queue_position ?? -1) + 1;
      const { error } = await sb()
        .from("books")
        .update({ queue_position: next })
        .eq("id", book.id);
      if (error) throw error;
    },
    onSuccess: (_d, b) => invalidateBooks(qc, b.id),
  });
}

export function useRemoveFromQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb()
        .from("books")
        .update({ queue_position: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => invalidateBooks(qc, id),
  });
}

// Persist a full reordering of the queue (array of book ids in order).
export function useReorderQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Sequential small updates keep it simple + RLS-safe.
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await sb()
          .from("books")
          .update({ queue_position: i })
          .eq("id", orderedIds[i]);
        if (error) throw error;
      }
    },
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: ["books"] });
      const prev = qc.getQueryData<Book[]>(["books"]);
      qc.setQueryData<Book[]>(["books"], (old) =>
        (old ?? []).map((b) => {
          const idx = orderedIds.indexOf(b.id);
          return idx >= 0 ? { ...b, queue_position: idx } : b;
        }),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["books"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

// =====================================================================
// Reading sessions (the habit log)
// =====================================================================
const SESSION_SELECT =
  "*, book:books(id, title, authors, cover_url, page_count, format, total_locations)";

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: async (): Promise<ReadingSession[]> => {
      const rows = await fetchAll<ReadingSession>(() =>
        sb()
          .from("reading_sessions")
          .select(SESSION_SELECT)
          .order("happened_on", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id"),
      );
      return rows.map((s) =>
        s.book ? { ...s, book: { ...s.book, cover_url: fixCoverUrl(s.book.cover_url) } } : s,
      );
    },
  });
}

export function useBookSessions(bookId: string | undefined) {
  return useQuery({
    enabled: !!bookId,
    queryKey: ["book-sessions", bookId],
    queryFn: async (): Promise<ReadingSession[]> => {
      const { data, error } = await sb()
        .from("reading_sessions")
        .select("*")
        .eq("book_id", bookId!)
        .order("happened_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReadingSession[];
    },
  });
}

export function useLogSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SessionInput) => {
      const user_id = await uid();
      const { end_position_minutes } = input;
      const { error } = await sb()
        .from("reading_sessions")
        .insert({ ...input, user_id });
      if (error) throw error;

      // Update the book: advance the bookmark + flip to "reading" if needed.
      const { data: book } = await sb()
        .from("books")
        .select(
          "format, current_page, audio_position_minutes, total_locations, current_location, read_status, started_on",
        )
        .eq("id", input.book_id)
        .maybeSingle();
      if (book) {
        const patch: Record<string, unknown> = {};
        if (book.format === "audiobook") {
          const newPos =
            end_position_minutes != null
              ? end_position_minutes
              : input.minutes
                ? (book.audio_position_minutes ?? 0) + input.minutes
                : null;
          if (newPos != null) patch.audio_position_minutes = newPos;
        } else if (book.format === "ebook" && (book.total_locations ?? 0) > 0) {
          const newLoc =
            input.end_location != null
              ? input.end_location
              : input.locations_read
                ? (book.current_location ?? 0) + input.locations_read
                : null;
          if (newLoc != null) patch.current_location = newLoc;
        } else {
          const newPage =
            input.end_page != null
              ? input.end_page
              : input.pages_read
                ? (book.current_page ?? 0) + input.pages_read
                : null;
          if (newPage != null) patch.current_page = newPage;
        }
        if (book.read_status === "unread") {
          patch.read_status = "reading";
          if (!book.started_on) patch.started_on = input.happened_on;
        }
        if (Object.keys(patch).length) {
          await sb().from("books").update(patch).eq("id", input.book_id);
        }
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["book-sessions", v.book_id] });
      invalidateBooks(qc, v.book_id);
    },
  });
}

// ---------------------------------------------------------------------
// Bookmark adjustments when a session is edited or deleted.
//
// Only the book's *latest* session can move the bookmark, and only if the
// bookmark is still where that session left it. If you've set the bookmark
// by hand since, or the session is an older one, the bookmark is left alone.
// ---------------------------------------------------------------------
type Unit = { pos: string; delta: string; end: string };
const UNITS: Record<"audio" | "loc" | "page", Unit> = {
  audio: { pos: "audio_position_minutes", delta: "minutes", end: "end_position_minutes" },
  loc: { pos: "current_location", delta: "locations_read", end: "end_location" },
  page: { pos: "current_page", delta: "pages_read", end: "end_page" },
};
const SESSION_COLS =
  "id, book_id, happened_on, created_at, pages_read, minutes, end_page, locations_read, end_location, end_position_minutes";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function bookUnit(bookId: string): Promise<{ unit: Unit; book: any } | null> {
  const { data: book } = await sb()
    .from("books")
    .select("format, total_locations, current_page, current_location, audio_position_minutes")
    .eq("id", bookId)
    .maybeSingle();
  if (!book) return null;
  const unit =
    book.format === "audiobook"
      ? UNITS.audio
      : book.format === "ebook" && (book.total_locations ?? 0) > 0
        ? UNITS.loc
        : UNITS.page;
  return { unit, book };
}

async function latestSessionId(bookId: string): Promise<string | null> {
  const { data } = await sb()
    .from("reading_sessions")
    .select("id")
    .eq("book_id", bookId)
    .order("happened_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

// Did this session put the bookmark where it is now?
function sessionOwnsBookmark(s: any, unit: Unit, current: number | null): boolean {
  const end = s[unit.end];
  if (end != null) return current === end;
  return true; // relative session ("read 30 pages") — the latest one owns it
}

const clampPos = (n: number | null) => (n == null || n <= 0 ? null : n);
/* eslint-enable @typescript-eslint/no-explicit-any */

// Edit a logged session in place, nudging the bookmark only when this was
// the session that set it.
export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      book_id,
      patch,
    }: {
      id: string;
      book_id: string;
      patch: Partial<
        Pick<
          ReadingSession,
          | "happened_on"
          | "pages_read"
          | "minutes"
          | "end_page"
          | "locations_read"
          | "end_location"
          | "end_position_minutes"
          | "note"
        >
      >;
    }) => {
      const { data: old } = await sb()
        .from("reading_sessions")
        .select(SESSION_COLS)
        .eq("id", id)
        .maybeSingle();
      const wasLatest = (await latestSessionId(book_id)) === id;
      const info = await bookUnit(book_id);

      const { error } = await sb().from("reading_sessions").update(patch).eq("id", id);
      if (error) throw error;

      if (old && info && wasLatest) {
        const { unit, book } = info;
        const current = book[unit.pos] as number | null;
        const touched = unit.delta in patch || unit.end in patch;
        if (touched && sessionOwnsBookmark(old, unit, current)) {
          const p = patch as Record<string, number | null | undefined>;
          const o = old as Record<string, number | null>;
          const newEnd = unit.end in patch ? p[unit.end] : o[unit.end];
          const next =
            newEnd != null
              ? newEnd
              : (current ?? 0) - (o[unit.delta] ?? 0) + ((unit.delta in patch ? p[unit.delta] : o[unit.delta]) ?? 0);
          await sb().from("books").update({ [unit.pos]: clampPos(next) }).eq("id", book_id);
        }
      }
      return book_id;
    },
    onSuccess: (book_id) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["book-sessions", book_id] });
      invalidateBooks(qc, book_id);
    },
  });
}

// Delete a session. If it was the latest one and the bookmark still sits
// where it left it, the bookmark steps back by what that session read.
export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: s } = await sb()
        .from("reading_sessions")
        .select(SESSION_COLS)
        .eq("id", id)
        .maybeSingle();
      const bookId = s?.book_id as string | undefined;
      const wasLatest = bookId ? (await latestSessionId(bookId)) === id : false;
      const info = bookId ? await bookUnit(bookId) : null;

      const { error } = await sb().from("reading_sessions").delete().eq("id", id);
      if (error) throw error;

      if (s && bookId && info && wasLatest) {
        const { unit, book } = info;
        const current = book[unit.pos] as number | null;
        if (sessionOwnsBookmark(s, unit, current)) {
          const o = s as Record<string, number | null>;
          const delta = o[unit.delta] ?? 0;
          let next: number | null;
          if (delta > 0) next = (current ?? 0) - delta;
          else {
            // No amount recorded — fall back to where the previous session ended.
            const { data: prev } = await sb()
              .from("reading_sessions")
              .select(unit.end)
              .eq("book_id", bookId)
              .not(unit.end, "is", null)
              .order("happened_on", { ascending: false })
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            next = ((prev as Record<string, number> | null)?.[unit.end] as number) ?? null;
          }
          await sb().from("books").update({ [unit.pos]: clampPos(next) }).eq("id", bookId);
        }
      }
      return bookId;
    },
    onSuccess: (bookId) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["book-sessions"] });
      invalidateBooks(qc, bookId);
    },
  });
}


// =====================================================================
// Quotes / highlights (commonplace book)
// =====================================================================
const QUOTE_SELECT = "*, book:books(id, title, authors, cover_url)";

export function useQuotes() {
  return useQuery({
    queryKey: ["quotes"],
    queryFn: async (): Promise<Quote[]> =>
      fetchAll<Quote>(() =>
        sb()
          .from("quotes")
          .select(QUOTE_SELECT)
          .order("created_at", { ascending: false })
          .order("id"),
      ),
  });
}

export function useBookQuotes(bookId: string | undefined) {
  return useQuery({
    enabled: !!bookId,
    queryKey: ["book-quotes", bookId],
    queryFn: async (): Promise<Quote[]> => {
      const { data, error } = await sb()
        .from("quotes")
        .select("*")
        .eq("book_id", bookId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Quote[];
    },
  });
}

export function useAddQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: QuoteInput) => {
      const user_id = await uid();
      const { error } = await sb().from("quotes").insert({ ...input, user_id });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["book-quotes", v.book_id] });
    },
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["book-quotes"] });
    },
  });
}

// =====================================================================
// Saved views / smart shelves
// =====================================================================
export function useSavedViews() {
  return useQuery({
    queryKey: ["saved-views"],
    queryFn: async (): Promise<SavedView[]> => {
      const { data, error } = await sb()
        .from("saved_views")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SavedView[];
    },
  });
}

export function useAddSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, query }: { name: string; query: ViewQuery }) => {
      const user_id = await uid();
      const { data: last } = await sb()
        .from("saved_views")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { error } = await sb()
        .from("saved_views")
        .insert({ user_id, name, query, sort_order: (last?.sort_order ?? -1) + 1 });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-views"] }),
  });
}

export function useDeleteSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("saved_views").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-views"] }),
  });
}

// =====================================================================
// Loans (lending ledger). The open loan decides the book's ownership:
// lending → "Lent out", borrowing → "Borrowed"; when it closes, a lent book
// is back to "Owned" and a borrowed one is "Not on my shelf".
// =====================================================================
const LOAN_SELECT = "*, book:books(id, title, authors, cover_url)";

// All loans (for the ledger page), active first, then most recent.
export function useLoans() {
  return useQuery({
    queryKey: ["loans"],
    queryFn: async (): Promise<Loan[]> =>
      fetchAll<Loan>(() =>
        sb()
          .from("loans")
          .select(LOAN_SELECT)
          .order("returned_on", { ascending: true, nullsFirst: true })
          .order("lent_on", { ascending: false })
          .order("id"),
      ),
  });
}

export function useBookLoans(bookId: string | undefined) {
  return useQuery({
    enabled: !!bookId,
    queryKey: ["book-loans", bookId],
    queryFn: async (): Promise<Loan[]> => {
      const { data, error } = await sb()
        .from("loans")
        .select("*")
        .eq("book_id", bookId!)
        .order("lent_on", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Loan[];
    },
  });
}

function invalidateLoans(qc: ReturnType<typeof useQueryClient>, bookId?: string) {
  qc.invalidateQueries({ queryKey: ["loans"] });
  if (bookId) qc.invalidateQueries({ queryKey: ["book-loans", bookId] });
  invalidateBooks(qc, bookId);
}

const ownershipAfterLoan = (direction: Loan["direction"]) =>
  direction === "lent_out" ? "owned" : "not_owned";

// Create a loan and reflect it on the book's ownership.
export function useAddLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LoanInput) => {
      const user_id = await uid();
      const { error } = await sb().from("loans").insert({ ...input, user_id });
      if (error) throw error;
      await sb()
        .from("books")
        .update({ ownership: input.direction })
        .eq("id", input.book_id);
    },
    onSuccess: (_d, v) => invalidateLoans(qc, v.book_id),
  });
}

export function useReturnLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (loan: Loan) => {
      const { error } = await sb()
        .from("loans")
        .update({ returned_on: todayISO() })
        .eq("id", loan.id);
      if (error) throw error;
      await sb()
        .from("books")
        .update({ ownership: ownershipAfterLoan(loan.direction) })
        .eq("id", loan.book_id);
    },
    onSuccess: (_d, loan) => invalidateLoans(qc, loan.book_id),
  });
}

// Deleting an open loan (a mistaken entry) also undoes its ownership change.
export function useDeleteLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (loan: Loan) => {
      const { error } = await sb().from("loans").delete().eq("id", loan.id);
      if (error) throw error;
      if (!loan.returned_on) {
        await sb()
          .from("books")
          .update({ ownership: ownershipAfterLoan(loan.direction) })
          .eq("id", loan.book_id);
      }
      return loan.book_id;
    },
    onSuccess: (bookId) => invalidateLoans(qc, bookId),
  });
}

// =====================================================================
// Read-throughs (per-read history)
// =====================================================================
export function useReadThroughs(bookId: string | undefined) {
  return useQuery({
    enabled: !!bookId,
    queryKey: ["read-throughs", bookId],
    queryFn: async (): Promise<ReadThrough[]> => {
      const { data, error } = await sb()
        .from("read_throughs")
        .select("*")
        .eq("book_id", bookId!);
      if (error) throw error;
      return sortReads((data ?? []) as ReadThrough[]);
    },
  });
}

// Every read across the library, each with its book — the basis for "books
// read this year", the finished chart and Wrapped. Includes removed books,
// because removing a book from the library doesn't un-read it.
export function useAllReadThroughs() {
  return useQuery({
    queryKey: ["all-read-throughs"],
    queryFn: async (): Promise<ReadThrough[]> => {
      const rows = await fetchAll<ReadThrough & { book: unknown }>(() =>
        sb()
          .from("read_throughs")
          .select(`*, book:books(${BOOK_SELECT})`)
          .order("created_at")
          .order("id"),
      );
      return rows.map((r) => ({ ...r, book: r.book ? mapBook(r.book) : undefined }));
    },
  });
}

export function useAddReadThrough() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReadThroughInput) => {
      const user_id = await uid();
      const { error } = await sb().from("read_throughs").insert({ ...input, user_id });
      if (error) throw error;
      await syncSummary(input.book_id);
      return input.book_id;
    },
    onSuccess: (bookId) => invalidateBooks(qc, bookId),
  });
}

export function useUpdateReadThrough() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      book_id,
      patch,
    }: {
      id: string;
      book_id: string;
      patch: Partial<ReadThroughInput>;
    }) => {
      const { error } = await sb().from("read_throughs").update(patch).eq("id", id);
      if (error) throw error;
      await syncSummary(book_id);
      return book_id;
    },
    onSuccess: (bookId) => invalidateBooks(qc, bookId),
  });
}

export function useDeleteReadThrough() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, book_id }: { id: string; book_id: string }) => {
      // A book marked Read must keep at least one read.
      const { data: b } = await sb()
        .from("books")
        .select("read_status")
        .eq("id", book_id)
        .maybeSingle();
      if (b?.read_status === "read" && (await bookReads(book_id)).length <= 1)
        throw new Error(
          "This is the book's only read. Change its status away from Read first.",
        );
      const { error } = await sb().from("read_throughs").delete().eq("id", id);
      if (error) throw error;
      await syncSummary(book_id);
      return book_id;
    },
    onSuccess: (bookId) => invalidateBooks(qc, bookId),
  });
}

// =====================================================================
// Notes while reading
// =====================================================================
export function useBookNotes(bookId: string | undefined) {
  return useQuery({
    enabled: !!bookId,
    queryKey: ["book-notes", bookId],
    queryFn: async (): Promise<BookNote[]> => {
      const { data, error } = await sb()
        .from("book_notes")
        .select("*")
        .eq("book_id", bookId!)
        .order("noted_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BookNote[];
    },
  });
}

export function useAddBookNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      notes: { book_id: string; body: string; page: number | null; noted_on?: string; created_at?: string }[],
    ) => {
      if (!notes.length) return;
      const user_id = await uid();
      const { error } = await sb()
        .from("book_notes")
        .insert(notes.map((n) => ({ ...n, user_id })));
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["book-notes"] }),
  });
}

export function useDeleteBookNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("book_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["book-notes"] }),
  });
}

// Bulk-add quotes (Kindle highlights import).
export function useAddQuotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      rows: { book_id: string; text: string; page: number | null; note: string | null; created_at?: string }[],
    ) => {
      if (!rows.length) return;
      const user_id = await uid();
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await sb()
          .from("quotes")
          .insert(rows.slice(i, i + 500).map((r) => ({ ...r, user_id })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["book-quotes"] });
    },
  });
}

// =====================================================================
// Recommendations ledger
// =====================================================================
const REC_SELECT = "*, book:books(id, title, authors, cover_url)";

export function useRecommendations() {
  return useQuery({
    queryKey: ["recommendations"],
    queryFn: async (): Promise<Recommendation[]> => {
      const rows = await fetchAll<Recommendation>(() =>
        sb()
          .from("recommendations")
          .select(REC_SELECT)
          .order("on_date", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id"),
      );
      return rows.map((r) =>
        r.book ? { ...r, book: { ...r.book, cover_url: fixCoverUrl(r.book.cover_url) } } : r,
      );
    },
  });
}

export function useBookRecommendations(bookId: string | undefined) {
  return useQuery({
    enabled: !!bookId,
    queryKey: ["recommendations", "book", bookId],
    queryFn: async (): Promise<Recommendation[]> => {
      const { data, error } = await sb()
        .from("recommendations")
        .select("*")
        .eq("book_id", bookId!)
        .order("on_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Recommendation[];
    },
  });
}

export function useAddRecommendations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      rows: {
        book_id: string;
        person: string;
        direction: "from" | "to";
        on_date?: string;
        channel?: string | null;
        note?: string | null;
      }[],
    ) => {
      if (!rows.length) return;
      const user_id = await uid();
      const { error } = await sb()
        .from("recommendations")
        .insert(rows.map((r) => ({ ...r, user_id })));
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recommendations"] }),
  });
}

export function useDeleteRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("recommendations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recommendations"] }),
  });
}

// =====================================================================
// Editions + bulk moves
// =====================================================================
// Mark books as editions of one work (or pass null to unlink them).
export function useSetEdition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, workId }: { ids: string[]; workId: string | null }) => {
      const { error } = await sb().from("books").update({ work_id: workId }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => invalidateBooks(qc),
  });
}

// Move books to another location (or off the shelves with null).
export function useMoveBooks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, locationId }: { ids: string[]; locationId: string | null }) => {
      for (let i = 0; i < ids.length; i += 200) {
        const { error } = await sb()
          .from("books")
          .update({ location_id: locationId })
          .in("id", ids.slice(i, i + 200));
        if (error) throw error;
      }
    },
    onSuccess: () => invalidateBooks(qc),
  });
}
