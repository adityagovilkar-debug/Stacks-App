import { uniqueAuthors } from "@/lib/utils";

// Look up a book by ISBN to auto-fill its details. For maximum coverage
// (especially regional / Indian publishers and older titles) this:
//   • tries BOTH the ISBN-10 and ISBN-13 forms (DBs often index only one),
//   • queries three free, key-less sources in parallel — Google Books,
//     Open Library's book API, and Open Library's larger Search index,
//   • merges every hit field-by-field so one source can fill another's gaps.
// Returns null only when nothing anywhere has a title.

export interface BookLookup {
  title: string;
  subtitle: string | null;
  authors: string[];
  isbn10: string | null;
  isbn13: string | null;
  cover_url: string | null;
  publisher: string | null;
  published_year: number | null;
  page_count: number | null;
  language: string | null;
  description: string | null;
  categories: string[]; // candidate genre tags
  source: "google" | "openlibrary";
}

// Keep only digits (and a trailing X for ISBN-10 check digits).
export function cleanIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, "").toUpperCase();
}

export function isValidIsbn(isbn: string): boolean {
  return isbn.length === 10 || isbn.length === 13;
}

// ---- ISBN-10 ⇄ ISBN-13 conversion (so we can query both forms) ------------
export function isbn10to13(isbn10: string): string | null {
  if (isbn10.length !== 10) return null;
  const core = "978" + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  const check = (10 - (sum % 10)) % 10;
  return core + check;
}

export function isbn13to10(isbn13: string): string | null {
  // Only 978-prefixed ISBN-13s have an ISBN-10 equivalent.
  if (isbn13.length !== 13 || !isbn13.startsWith("978")) return null;
  const core = isbn13.slice(3, 12); // 9 digits
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(core[i]) * (10 - i);
  const check = (11 - (sum % 11)) % 11;
  return core + (check === 10 ? "X" : String(check));
}

// Both ISBN forms for a code (deduped, valid only).
function isbnForms(isbn: string): string[] {
  const forms = new Set<string>([isbn]);
  if (isbn.length === 10) {
    const c = isbn10to13(isbn);
    if (c) forms.add(c);
  } else if (isbn.length === 13) {
    const c = isbn13to10(isbn);
    if (c) forms.add(c);
  }
  return [...forms];
}

function yearFrom(date: string | undefined | null): number | null {
  if (!date) return null;
  const m = String(date).match(/\d{4}/);
  return m ? Number(m[0]) : null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Map a Google Books volumeInfo object to our shape.
function mapGoogleVolume(v: any): BookLookup | null {
  if (!v?.title) return null;
  const ids: { type: string; identifier: string }[] =
    v.industryIdentifiers ?? [];
  let cover: string | null =
    v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail ?? null;
  if (cover) cover = cover.replace(/^http:/, "https:").replace(/&edge=curl/, "");
  return {
    title: v.title,
    subtitle: v.subtitle ?? null,
    authors: v.authors ?? [],
    isbn13: ids.find((i) => i.type === "ISBN_13")?.identifier ?? null,
    isbn10: ids.find((i) => i.type === "ISBN_10")?.identifier ?? null,
    cover_url: cover,
    publisher: v.publisher ?? null,
    published_year: yearFrom(v.publishedDate),
    page_count: typeof v.pageCount === "number" ? v.pageCount : null,
    language: v.language ?? null,
    description: v.description ?? null,
    categories: v.categories ?? [],
    source: "google",
  };
}

// Map an Open Library Search `docs[]` entry to our shape.
function mapOlDoc(d: any): BookLookup | null {
  if (!d?.title) return null;
  const isbns: string[] = d.isbn ?? [];
  return {
    title: d.title,
    subtitle: d.subtitle ?? null,
    authors: d.author_name ?? [],
    isbn13: isbns.find((x) => x.length === 13) ?? null,
    isbn10: isbns.find((x) => x.length === 10) ?? null,
    cover_url: d.cover_i
      ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`
      : null,
    publisher: d.publisher?.[0] ?? null,
    published_year: d.first_publish_year ?? null,
    page_count:
      typeof d.number_of_pages_median === "number"
        ? d.number_of_pages_median
        : null,
    language: d.language?.[0] ?? null,
    description: null,
    categories: (d.subject ?? []).slice(0, 6),
    source: "openlibrary",
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---- Sources --------------------------------------------------------------
async function fromGoogle(isbn: string): Promise<BookLookup | null> {
  // Try plain first, then with an India country hint (some records are
  // availability-gated and only surface with a country param).
  for (const suffix of ["", "&country=IN"]) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}${suffix}`,
      );
      if (!res.ok) continue;
      const data = await res.json();
      const m = mapGoogleVolume(data.items?.[0]?.volumeInfo);
      if (m) return m;
    } catch {
      // try next suffix
    }
  }
  return null;
}

async function fromOpenLibraryData(isbn: string): Promise<BookLookup | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(
        isbn,
      )}&format=json&jscmd=data`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const b = data[`ISBN:${isbn}`];
    if (!b?.title) return null;
    const ident = b.identifiers ?? {};
    return {
      title: b.title,
      subtitle: b.subtitle ?? null,
      authors: (b.authors ?? []).map((a: { name: string }) => a.name),
      isbn10: ident.isbn_10?.[0] ?? null,
      isbn13: ident.isbn_13?.[0] ?? null,
      cover_url: b.cover?.large ?? b.cover?.medium ?? null,
      publisher: b.publishers?.[0]?.name ?? null,
      published_year: yearFrom(b.publish_date),
      page_count: typeof b.number_of_pages === "number" ? b.number_of_pages : null,
      language: null,
      description:
        typeof b.notes === "string" ? b.notes : (b.notes?.value ?? null),
      categories: (b.subjects ?? []).slice(0, 6).map((s: { name: string }) => s.name),
      source: "openlibrary",
    };
  } catch {
    return null;
  }
}

async function fromOpenLibrarySearch(isbn: string): Promise<BookLookup | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?isbn=${encodeURIComponent(
        isbn,
      )}&fields=title,subtitle,author_name,first_publish_year,number_of_pages_median,cover_i,publisher,language,subject&limit=1`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const d = data.docs?.[0];
    if (!d?.title) return null;
    return {
      title: d.title,
      subtitle: d.subtitle ?? null,
      authors: d.author_name ?? [],
      isbn10: isbn.length === 10 ? isbn : null,
      isbn13: isbn.length === 13 ? isbn : null,
      cover_url: d.cover_i
        ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`
        : null,
      publisher: d.publisher?.[0] ?? null,
      published_year: d.first_publish_year ?? null,
      page_count:
        typeof d.number_of_pages_median === "number"
          ? d.number_of_pages_median
          : null,
      language: d.language?.[0] ?? null,
      description: null,
      categories: (d.subject ?? []).slice(0, 6),
      source: "openlibrary",
    };
  } catch {
    return null;
  }
}

// Merge hits field-by-field, in priority order (the array order of `results`).
function firstArr(results: BookLookup[], key: "authors" | "categories"): string[] {
  for (const r of results) if (r[key]?.length) return r[key];
  return [];
}
function merge(results: BookLookup[]): BookLookup | null {
  if (!results.length) return null;
  const pick = <K extends keyof BookLookup>(key: K): BookLookup[K] => {
    for (const r of results) {
      const v = r[key];
      if (v !== null && v !== undefined && v !== "") return v;
    }
    return results[0][key];
  };
  const out: BookLookup = {
    title: pick("title"),
    subtitle: pick("subtitle"),
    authors: uniqueAuthors(firstArr(results, "authors")),
    isbn10: pick("isbn10"),
    isbn13: pick("isbn13"),
    cover_url: pick("cover_url"),
    publisher: pick("publisher"),
    published_year: pick("published_year"),
    page_count: pick("page_count"),
    language: pick("language"),
    description: pick("description"),
    categories: firstArr(results, "categories"),
    source: results[0].source,
  };
  return out.title ? out : null;
}

export async function lookupIsbn(raw: string): Promise<BookLookup | null> {
  const isbn = cleanIsbn(raw);
  if (!isValidIsbn(isbn)) return null;

  const forms = isbnForms(isbn);
  // All sources × both ISBN forms, in parallel. Order defines merge priority.
  const tasks: Promise<BookLookup | null>[] = [];
  for (const f of forms) {
    tasks.push(fromGoogle(f), fromOpenLibraryData(f), fromOpenLibrarySearch(f));
  }
  const settled = await Promise.allSettled(tasks);
  const hits = settled.flatMap((s) =>
    s.status === "fulfilled" && s.value ? [s.value] : [],
  );

  const out = merge(hits);
  if (!out) return null;

  // Make sure both ISBN forms are recorded, then guarantee a cover.
  for (const f of forms) {
    if (f.length === 13 && !out.isbn13) out.isbn13 = f;
    if (f.length === 10 && !out.isbn10) out.isbn10 = f;
  }
  if (!out.cover_url) {
    const c = out.isbn13 || out.isbn10 || isbn;
    out.cover_url = `https://covers.openlibrary.org/b/isbn/${c}-L.jpg`;
  }
  return out;
}

// ---- Free-text search (title / author) ------------------------------------
// Fallback for books an ISBN can't find: search Google Books + Open Library
// by title/author and return a deduped list of candidates to pick from.
function candidateKey(r: BookLookup): string {
  const isbn = r.isbn13 || r.isbn10;
  if (isbn) return `i:${isbn.replace(/[^0-9X]/gi, "").toUpperCase()}`;
  return `t:${r.title.trim().toLowerCase()}|${(r.authors[0] ?? "").trim().toLowerCase()}`;
}

export async function searchBooks(query: string): Promise<BookLookup[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const [g, o] = await Promise.allSettled([
    fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
    fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(
        q,
      )}&fields=title,subtitle,author_name,first_publish_year,number_of_pages_median,cover_i,publisher,language,subject,isbn&limit=8`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);

  const out: BookLookup[] = [];
  if (g.status === "fulfilled" && g.value?.items) {
    for (const it of g.value.items) {
      const m = mapGoogleVolume(it.volumeInfo);
      if (m) out.push(m);
    }
  }
  if (o.status === "fulfilled" && o.value?.docs) {
    for (const d of o.value.docs) {
      const m = mapOlDoc(d);
      if (m) out.push(m);
    }
  }

  // Dedupe (Google entries come first, so they win), clean author lists.
  const seen = new Set<string>();
  const res: BookLookup[] = [];
  for (const r of out) {
    const k = candidateKey(r);
    if (seen.has(k)) continue;
    seen.add(k);
    r.authors = uniqueAuthors(r.authors);
    res.push(r);
  }
  return res.slice(0, 12);
}
