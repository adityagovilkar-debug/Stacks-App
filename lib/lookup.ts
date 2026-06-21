// Look up a book by ISBN to auto-fill its details. Tries Google Books first
// (richer: description, categories, page count, cover) and falls back to Open
// Library. Both are free and need no API key. Returns null on a total miss.

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

function yearFrom(date: string | undefined | null): number | null {
  if (!date) return null;
  const m = String(date).match(/\d{4}/);
  return m ? Number(m[0]) : null;
}

async function fromGoogle(isbn: string): Promise<BookLookup | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const v = data.items?.[0]?.volumeInfo;
    if (!v?.title) return null;

    const ids: { type: string; identifier: string }[] =
      v.industryIdentifiers ?? [];
    const isbn13 =
      ids.find((i) => i.type === "ISBN_13")?.identifier ??
      (isbn.length === 13 ? isbn : null);
    const isbn10 =
      ids.find((i) => i.type === "ISBN_10")?.identifier ??
      (isbn.length === 10 ? isbn : null);

    let cover: string | null =
      v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail ?? null;
    if (cover) cover = cover.replace(/^http:/, "https:").replace(/&edge=curl/, "");

    return {
      title: v.title,
      subtitle: v.subtitle ?? null,
      authors: v.authors ?? [],
      isbn10,
      isbn13,
      cover_url: cover,
      publisher: v.publisher ?? null,
      published_year: yearFrom(v.publishedDate),
      page_count: typeof v.pageCount === "number" ? v.pageCount : null,
      language: v.language ?? null,
      description: v.description ?? null,
      categories: v.categories ?? [],
      source: "google",
    };
  } catch {
    return null;
  }
}

async function fromOpenLibrary(isbn: string): Promise<BookLookup | null> {
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
      isbn10: ident.isbn_10?.[0] ?? (isbn.length === 10 ? isbn : null),
      isbn13: ident.isbn_13?.[0] ?? (isbn.length === 13 ? isbn : null),
      cover_url: b.cover?.large ?? b.cover?.medium ?? null,
      publisher: b.publishers?.[0]?.name ?? null,
      published_year: yearFrom(b.publish_date),
      page_count: typeof b.number_of_pages === "number" ? b.number_of_pages : null,
      language: null,
      description:
        typeof b.notes === "string"
          ? b.notes
          : (b.notes?.value ?? null),
      categories: (b.subjects ?? [])
        .slice(0, 6)
        .map((s: { name: string }) => s.name),
      source: "openlibrary",
    };
  } catch {
    return null;
  }
}

export async function lookupIsbn(rawIsbn: string): Promise<BookLookup | null> {
  const isbn = cleanIsbn(rawIsbn);
  if (isbn.length !== 10 && isbn.length !== 13) return null;

  const google = await fromGoogle(isbn);
  const ol = await fromOpenLibrary(isbn);

  if (!google && !ol) return null;
  if (!google) return withFallbackCover(ol!, isbn);
  if (!ol) return withFallbackCover(google, isbn);

  // Merge: prefer Google, fill gaps from Open Library.
  return withFallbackCover(
    {
      ...google,
      subtitle: google.subtitle ?? ol.subtitle,
      authors: google.authors.length ? google.authors : ol.authors,
      cover_url: google.cover_url ?? ol.cover_url,
      publisher: google.publisher ?? ol.publisher,
      published_year: google.published_year ?? ol.published_year,
      page_count: google.page_count ?? ol.page_count,
      description: google.description ?? ol.description,
      categories: google.categories.length ? google.categories : ol.categories,
    },
    isbn,
  );
}

// Open Library serves a cover-by-ISBN endpoint that's a reliable last resort.
function withFallbackCover(b: BookLookup, isbn: string): BookLookup {
  if (!b.cover_url) {
    b.cover_url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  }
  return b;
}
