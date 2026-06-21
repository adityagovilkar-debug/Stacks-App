"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ScanLine, Keyboard, Search, Check, Loader2, CopyCheck } from "lucide-react";
import { BookForm } from "@/components/BookForm";
import { IsbnScanner } from "@/components/IsbnScanner";
import { BookCover } from "@/components/BookCover";
import { useAddBook, useBooks } from "@/lib/queries";
import { cleanIsbn, lookupIsbn, searchBooks, type BookLookup } from "@/lib/lookup";
import { findExisting } from "@/lib/duplicates";
import { emptyBookInput, type Book, type BookInput } from "@/lib/types";
import { cn } from "@/lib/utils";

type Mode = "scan" | "search" | "manual";

function lookupToInput(l: BookLookup): BookInput {
  return {
    ...emptyBookInput(),
    title: l.title,
    subtitle: l.subtitle,
    authors: l.authors,
    isbn10: l.isbn10,
    isbn13: l.isbn13,
    cover_url: l.cover_url,
    publisher: l.publisher,
    published_year: l.published_year,
    page_count: l.page_count,
    language: l.language,
    description: l.description,
  };
}

export default function AddPage() {
  const router = useRouter();
  const add = useAddBook();
  const { data: books = [] } = useBooks();

  const [mode, setMode] = useState<Mode>("scan");
  const [scanning, setScanning] = useState(true);
  const [batch, setBatch] = useState(false);
  const [isbn, setIsbn] = useState("");
  const [looking, setLooking] = useState(false);
  const [value, setValue] = useState<BookInput | null>(null);
  const [added, setAdded] = useState<{ title: string; cover: string | null }[]>([]);

  // Title/author search
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<BookLookup[] | null>(null);

  function switchMode(m: Mode) {
    setMode(m);
    if (m === "manual") {
      setValue((v) => v ?? emptyBookInput());
      setScanning(false);
    } else if (m === "search") {
      setScanning(false);
      setValue(null);
    } else {
      setScanning(true);
      setValue(null);
    }
  }

  // Look up an ISBN and either quick-add (batch) or open the form for review.
  async function handleIsbn(raw: string) {
    const code = cleanIsbn(raw);
    if (code.length !== 10 && code.length !== 13) {
      toast.error("That doesn't look like an ISBN");
      return;
    }
    setLooking(true);
    try {
      const result = await lookupIsbn(code);
      if (!result) {
        toast.error("No ISBN match — try Title search, or edit below");
        setValue({ ...emptyBookInput(), isbn13: code.length === 13 ? code : null, isbn10: code.length === 10 ? code : null });
        setScanning(false);
        return;
      }
      if (batch) {
        // In batch mode, silently skip re-scans of books you already own so a
        // double pass over a shelf doesn't create duplicates. (Add a deliberate
        // extra copy via the review/manual flow instead.)
        if (findExisting(books, result)) {
          toast(`Already on your shelves — skipped “${result.title}”`);
          return;
        }
        await add.mutateAsync(lookupToInput(result));
        setAdded((a) => [{ title: result.title, cover: result.cover_url }, ...a].slice(0, 12));
        toast.success(`Added “${result.title}”`);
      } else {
        setValue(lookupToInput(result));
        setScanning(false);
        toast.success(`Found “${result.title}” — review & save`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLooking(false);
      setIsbn("");
    }
  }

  async function runSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    setValue(null);
    try {
      const r = await searchBooks(q);
      setResults(r);
      if (!r.length) toast("No matches — try fewer words, or add it manually");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function pickResult(r: BookLookup) {
    setValue(lookupToInput(r));
    setResults(null);
  }

  async function saveForm() {
    if (!value?.title.trim()) return toast.error("A title is required");
    try {
      const id = await add.mutateAsync(value);
      toast.success("Added to your library");
      router.push(`/book/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    }
  }

  const reviewCard = value ? (
    <div className="card p-5">
      <DupWarning existing={findExisting(books, value)} />
      <BookForm value={value} onChange={setValue} />
      <button className="btn-primary mt-5 w-full" onClick={saveForm} disabled={add.isPending}>
        {add.isPending ? "Saving…" : "Add to library"}
      </button>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold misreg">Add a book</h1>
        <p className="mt-2 text-text-muted">
          Scan a barcode, look up an ISBN, search by title, or enter it by hand.
        </p>
      </header>

      {/* Mode switch */}
      <div className="inline-flex flex-wrap rounded-xl border-[2.5px] border-outline bg-surface-2 p-1">
        {([
          { key: "scan", label: "Scan / ISBN", icon: ScanLine },
          { key: "search", label: "Title search", icon: Search },
          { key: "manual", label: "Manual", icon: Keyboard },
        ] as const).map((m) => (
          <button
            key={m.key}
            onClick={() => switchMode(m.key)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 font-bold transition",
              mode === m.key ? "bg-riso-blue text-white" : "text-text-muted",
            )}
          >
            <m.icon className="h-4 w-4" /> {m.label}
          </button>
        ))}
      </div>

      {/* SCAN / ISBN */}
      {mode === "scan" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            {scanning ? (
              <IsbnScanner active={scanning} onDetected={handleIsbn} />
            ) : (
              <button className="btn-outline w-full" onClick={() => setScanning(true)}>
                <ScanLine className="h-5 w-5" /> Resume scanning
              </button>
            )}

            <label className="flex cursor-pointer items-center justify-between rounded-xl border-2 border-outline bg-surface px-4 py-3">
              <span className="text-sm font-bold">
                Batch mode
                <span className="block text-xs font-normal text-text-muted">
                  Quick-add each scan without reviewing
                </span>
              </span>
              <input
                type="checkbox"
                checked={batch}
                onChange={(e) => setBatch(e.target.checked)}
                className="h-5 w-5 accent-riso-blue"
              />
            </label>

            <div className="flex gap-2">
              <input
                className="input"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleIsbn(isbn)}
                placeholder="…or type an ISBN"
                inputMode="numeric"
              />
              <button
                className="btn-primary shrink-0"
                onClick={() => handleIsbn(isbn)}
                disabled={looking}
              >
                {looking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                Look up
              </button>
            </div>

            <button
              className="text-sm font-bold text-riso-blue hover:underline"
              onClick={() => switchMode("search")}
            >
              Can&apos;t find it by ISBN? Search by title →
            </button>

            {batch && added.length > 0 && (
              <div className="card-soft p-3">
                <p className="mb-2 text-sm font-bold text-riso-blue">
                  <Check className="mr-1 inline h-4 w-4" />
                  Added {added.length} {added.length === 1 ? "book" : "books"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {added.map((b, i) => (
                    <div key={i} className="w-10" title={b.title}>
                      <BookCover title={b.title} coverUrl={b.cover} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Review form appears after a (non-batch) lookup */}
          {!batch && reviewCard}
        </div>
      )}

      {/* TITLE SEARCH */}
      {mode === "search" && (
        <div className="space-y-5">
          <div className="flex gap-2">
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Title, author, or keywords…"
              autoFocus
            />
            <button className="btn-primary shrink-0" onClick={runSearch} disabled={searching}>
              {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              Search
            </button>
          </div>

          {results && results.length > 0 && !value && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => pickResult(r)}
                  className="card-soft flex items-start gap-3 p-3 text-left transition hover:border-riso-blue"
                >
                  <div className="w-12 shrink-0">
                    <BookCover title={r.title} authors={r.authors} coverUrl={r.cover_url} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-bold leading-tight line-clamp-2">
                      {r.title}
                    </p>
                    {r.authors.length > 0 && (
                      <p className="mt-0.5 text-xs text-text-muted line-clamp-1">
                        {r.authors.join(", ")}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-text-muted">
                      {[r.published_year, r.publisher].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results && results.length === 0 && !value && (
            <p className="card-soft p-4 text-sm text-text-muted">
              No matches. Try fewer/different words, or{" "}
              <button onClick={() => switchMode("manual")} className="font-bold text-riso-blue">
                add it manually
              </button>
              .
            </p>
          )}

          {/* Review the picked result before saving */}
          {value && (
            <div className="mx-auto max-w-2xl">
              <button
                className="mb-3 text-sm font-bold text-text-muted hover:text-text"
                onClick={() => setValue(null)}
              >
                ← Back to results
              </button>
              {reviewCard}
            </div>
          )}
        </div>
      )}

      {/* MANUAL */}
      {mode === "manual" && (
        <div className="max-w-2xl">{reviewCard}</div>
      )}
    </div>
  );
}

// Non-blocking heads-up shown in the add form when the book already exists.
// You can still add it (a deliberate second copy) — this just prevents the
// accidental kind.
function DupWarning({ existing }: { existing: Book | null }) {
  if (!existing) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-xl border-2 border-outline bg-riso-orange/15 px-3 py-2.5 text-sm">
      <CopyCheck className="mt-0.5 h-5 w-5 shrink-0 text-riso-orange" />
      <p>
        You already have <b>{existing.title}</b> on your shelves.{" "}
        <Link href={`/book/${existing.id}`} className="font-bold text-riso-blue underline">
          View your copy
        </Link>
        . Adding will create a second copy — fine if that&apos;s on purpose.
      </p>
    </div>
  );
}
