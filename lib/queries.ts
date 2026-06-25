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
  BookInput,
  Collection,
  Location,
  Profile,
  Quote,
  QuoteInput,
  ReadStatus,
  ReadingSession,
  SavedView,
  SessionInput,
  Tag,
  ViewQuery,
} from "@/lib/types";

const sb = supabaseBrowser;

async function uid(): Promise<string> {
  const {
    data: { user },
  } = await sb().auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
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
    tags: (row.book_tags ?? []).map((bt: any) => bt.tag).filter(Boolean),
    collection_ids: (row.collection_books ?? []).map((cb: any) => cb.collection_id),
    location: row.location ?? null,
  } as Book;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function useBooks() {
  return useQuery({
    queryKey: ["books"],
    queryFn: async (): Promise<Book[]> => {
      const { data, error } = await sb()
        .from("books")
        .select(BOOK_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapBook);
    },
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
  if (id) qc.invalidateQueries({ queryKey: ["book", id] });
}

export function useAddBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BookInput) => {
      const user_id = await uid();
      const { cols, tag_ids, collection_ids } = splitInput(input);
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
      const { cols, tag_ids, collection_ids } = splitInput(input);
      const { error } = await sb().from("books").update(cols).eq("id", id);
      if (error) throw error;
      await setBookTags(id, user_id, tag_ids);
      await setBookCollections(id, user_id, collection_ids);
    },
    onSuccess: (_d, v) => invalidateBooks(qc, v.id),
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateBooks(qc),
  });
}

// Patch a few book columns directly (rating, favorite, bookmark, review…).
export function usePatchBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Book> }) => {
      const { error } = await sb().from("books").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => invalidateBooks(qc, v.id),
  });
}

// Change read status with the sensible side-effects.
export function useSetReadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ book, status }: { book: Book; status: ReadStatus }) => {
      const patch: Partial<Book> = { read_status: status };
      const today = todayISO();
      if (status === "reading" && !book.started_on) patch.started_on = today;
      if (status === "read") {
        if (!book.finished_on) patch.finished_on = today;
        if (book.times_read < 1) patch.times_read = 1;
        patch.queue_position = null;
      }
      const { error } = await sb().from("books").update(patch).eq("id", book.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => invalidateBooks(qc, v.book.id),
  });
}

// Mark another completed read-through.
export function useReadAgain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (book: Book) => {
      const { error } = await sb()
        .from("books")
        .update({
          times_read: book.times_read + 1,
          read_status: "read",
          finished_on: todayISO(),
          current_page: null,
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
  "*, book:books(id, title, authors, cover_url, page_count)";

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: async (): Promise<ReadingSession[]> => {
      const { data, error } = await sb()
        .from("reading_sessions")
        .select(SESSION_SELECT)
        .order("happened_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReadingSession[];
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
      // end_position_minutes is audiobook-only and not a sessions column.
      const { end_position_minutes, ...sessionRow } = input;
      const { error } = await sb()
        .from("reading_sessions")
        .insert({ ...sessionRow, user_id });
      if (error) throw error;

      // Update the book: advance the bookmark + flip to "reading" if needed.
      const { data: book } = await sb()
        .from("books")
        .select("format, current_page, audio_position_minutes, read_status, started_on")
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

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("reading_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["book-sessions"] });
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
    queryFn: async (): Promise<Quote[]> => {
      const { data, error } = await sb()
        .from("quotes")
        .select(QUOTE_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Quote[];
    },
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
