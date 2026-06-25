// Shared data types for Stacks + the small fixed color palette used for tags
// and collections.

export type ReadStatus =
  | "unread"
  | "reading"
  | "on_hold"
  | "abandoned"
  | "read";
export type Ownership = "owned" | "wishlist" | "borrowed" | "lent_out";
export type BookFormat =
  | "hardcover"
  | "paperback"
  | "ebook"
  | "audiobook"
  | "other";
export type TagKind = "genre" | "mood" | "theme" | "tag";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  timezone: string;
  goal_books_per_year: number;
  goal_pages_per_day: number;
  goal_minutes_per_day: number;
  created_at: string;
}

export interface Location {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  kind: TagKind;
  color: PaletteKey;
  created_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: PaletteKey;
  sort_order: number;
  created_at: string;
}

export interface Book {
  id: string;
  user_id: string;
  // identity
  title: string;
  subtitle: string | null;
  authors: string[];
  isbn10: string | null;
  isbn13: string | null;
  cover_url: string | null;
  publisher: string | null;
  published_year: number | null;
  page_count: number | null;
  duration_minutes: number | null; // total length for audiobooks
  language: string | null;
  description: string | null;
  // classification
  format: BookFormat | null;
  series_name: string | null;
  series_index: number | null;
  classification_system: "genre" | "dewey" | "custom" | null;
  classification: string | null;
  classification_code: string | null;
  // ownership / physical
  ownership: Ownership;
  condition: string | null;
  acquired_on: string | null;
  source: string | null;
  location_id: string | null;
  // reading state
  read_status: ReadStatus;
  times_read: number;
  rating: number | null; // 0–5 in 0.5 steps
  favorite: boolean;
  current_page: number | null; // the bookmark (pages)
  audio_position_minutes: number | null; // the bookmark (audiobooks)
  review: string | null;
  started_on: string | null;
  finished_on: string | null;
  queue_position: number | null; // null = not in the to-read queue
  created_at: string;
  updated_at: string;
  // joined / computed client-side
  tags?: Tag[];
  collection_ids?: string[];
  location?: Location | null;
}

// What the Add/Edit form produces (everything editable on a book).
export interface BookInput {
  title: string;
  subtitle: string | null;
  authors: string[];
  isbn10: string | null;
  isbn13: string | null;
  cover_url: string | null;
  publisher: string | null;
  published_year: number | null;
  page_count: number | null;
  duration_minutes: number | null;
  language: string | null;
  description: string | null;
  format: BookFormat | null;
  series_name: string | null;
  series_index: number | null;
  classification_system: "genre" | "dewey" | "custom" | null;
  classification: string | null;
  classification_code: string | null;
  ownership: Ownership;
  condition: string | null;
  acquired_on: string | null;
  source: string | null;
  location_id: string | null;
  read_status: ReadStatus;
  rating: number | null;
  favorite: boolean;
  review: string | null;
  // chosen tag + collection ids (reconciled into join tables on save)
  tag_ids: string[];
  collection_ids: string[];
}

export interface ReadingSession {
  id: string;
  user_id: string;
  book_id: string;
  happened_on: string; // YYYY-MM-DD
  pages_read: number;
  minutes: number | null;
  end_page: number | null;
  note: string | null;
  created_at: string;
  // joined
  book?: Pick<Book, "id" | "title" | "authors" | "cover_url" | "page_count" | "format">;
}

export interface SessionInput {
  book_id: string;
  happened_on: string;
  pages_read: number;
  minutes: number | null;
  end_page: number | null;
  end_position_minutes: number | null; // audiobook "now at" position
  note: string | null;
}

export interface Quote {
  id: string;
  user_id: string;
  book_id: string;
  text: string;
  page: number | null;
  note: string | null;
  created_at: string;
  // joined
  book?: Pick<Book, "id" | "title" | "authors" | "cover_url">;
}

export interface QuoteInput {
  book_id: string;
  text: string;
  page: number | null;
  note: string | null;
}

// A serialized library filter combination — the body of a "smart shelf".
export interface ViewQuery {
  q?: string;
  status?: ReadStatus[];
  ownership?: Ownership[];
  formats?: BookFormat[];
  tagIds?: string[];
  collectionId?: string;
  locationId?: string;
  favOnly?: boolean;
  minRating?: number;
  sort?: string;
}

export interface SavedView {
  id: string;
  user_id: string;
  name: string;
  query: ViewQuery;
  sort_order: number;
  created_at: string;
}

// ---------------------------------------------------------------------
// Labels for the enums (UI display).
// ---------------------------------------------------------------------
export const READ_STATUS_LABEL: Record<ReadStatus, string> = {
  unread: "Unread",
  reading: "Reading",
  on_hold: "On hold",
  abandoned: "Abandoned",
  read: "Read",
};

export const OWNERSHIP_LABEL: Record<Ownership, string> = {
  owned: "Owned",
  wishlist: "Wishlist",
  borrowed: "Borrowed",
  lent_out: "Lent out",
};

export const FORMAT_LABEL: Record<BookFormat, string> = {
  hardcover: "Hardcover",
  paperback: "Paperback",
  ebook: "E-book",
  audiobook: "Audiobook",
  other: "Other",
};

export const TAG_KIND_LABEL: Record<TagKind, string> = {
  genre: "Genre",
  mood: "Mood",
  theme: "Theme",
  tag: "Tag",
};

// ---------------------------------------------------------------------
// Color palette (riso inks). Tags + collections store a key; the UI maps
// it to classes here so colors stay consistent in light + dark.
// ---------------------------------------------------------------------
export type PaletteKey =
  | "pink"
  | "blue"
  | "yellow"
  | "orange"
  | "purple"
  | "slate";

export const PALETTE: Record<
  PaletteKey,
  { label: string; dot: string; chip: string; hex: string }
> = {
  pink: { label: "Pink", dot: "bg-riso-pink", chip: "bg-riso-pink/15", hex: "#ff4f9a" },
  blue: { label: "Blue", dot: "bg-riso-blue", chip: "bg-riso-blue/15", hex: "#0b63f6" },
  yellow: { label: "Yellow", dot: "bg-riso-yellow", chip: "bg-riso-yellow/25", hex: "#ffd23f" },
  orange: { label: "Orange", dot: "bg-riso-orange", chip: "bg-riso-orange/15", hex: "#ff6f3c" },
  purple: { label: "Purple", dot: "bg-riso-purple", chip: "bg-riso-purple/15", hex: "#7b5cff" },
  slate: { label: "Slate", dot: "bg-text-muted", chip: "bg-surface-2", hex: "#756849" },
};

export const PALETTE_KEYS = Object.keys(PALETTE) as PaletteKey[];

export function palette(key: string | null | undefined) {
  return PALETTE[(key as PaletteKey) ?? "slate"] ?? PALETTE.slate;
}

// ---------------------------------------------------------------------
// Form helpers — a blank BookInput, and converting a Book into one.
// ---------------------------------------------------------------------
export function emptyBookInput(): BookInput {
  return {
    title: "",
    subtitle: null,
    authors: [],
    isbn10: null,
    isbn13: null,
    cover_url: null,
    publisher: null,
    published_year: null,
    page_count: null,
    duration_minutes: null,
    language: null,
    description: null,
    format: null,
    series_name: null,
    series_index: null,
    classification_system: null,
    classification: null,
    classification_code: null,
    ownership: "owned",
    condition: null,
    acquired_on: null,
    source: null,
    location_id: null,
    read_status: "unread",
    rating: null,
    favorite: false,
    review: null,
    tag_ids: [],
    collection_ids: [],
  };
}

export function bookToInput(b: Book): BookInput {
  return {
    title: b.title,
    subtitle: b.subtitle,
    authors: b.authors ?? [],
    isbn10: b.isbn10,
    isbn13: b.isbn13,
    cover_url: b.cover_url,
    publisher: b.publisher,
    published_year: b.published_year,
    page_count: b.page_count,
    duration_minutes: b.duration_minutes,
    language: b.language,
    description: b.description,
    format: b.format,
    series_name: b.series_name,
    series_index: b.series_index,
    classification_system: b.classification_system,
    classification: b.classification,
    classification_code: b.classification_code,
    ownership: b.ownership,
    condition: b.condition,
    acquired_on: b.acquired_on,
    source: b.source,
    location_id: b.location_id,
    read_status: b.read_status,
    rating: b.rating,
    favorite: b.favorite,
    review: b.review,
    tag_ids: (b.tags ?? []).map((t) => t.id),
    collection_ids: b.collection_ids ?? [],
  };
}
