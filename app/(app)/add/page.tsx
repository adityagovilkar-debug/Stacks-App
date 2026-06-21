"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ScanLine, Keyboard, Search, Check, Loader2 } from "lucide-react";
import { BookForm } from "@/components/BookForm";
import { IsbnScanner } from "@/components/IsbnScanner";
import { BookCover } from "@/components/BookCover";
import { useAddBook } from "@/lib/queries";
import { cleanIsbn, lookupIsbn, type BookLookup } from "@/lib/lookup";
import { emptyBookInput, type BookInput } from "@/lib/types";
import { cn } from "@/lib/utils";

type Mode = "scan" | "manual";

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

  const [mode, setMode] = useState<Mode>("scan");
  const [scanning, setScanning] = useState(true);
  const [batch, setBatch] = useState(false);
  const [isbn, setIsbn] = useState("");
  const [looking, setLooking] = useState(false);
  const [value, setValue] = useState<BookInput | null>(null);
  const [added, setAdded] = useState<{ title: string; cover: string | null }[]>([]);

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
        toast.error("No match found — add it manually");
        setValue({ ...emptyBookInput(), isbn13: code.length === 13 ? code : null, isbn10: code.length === 10 ? code : null });
        setScanning(false);
        return;
      }
      if (batch) {
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold misreg">Add a book</h1>
        <p className="mt-2 text-text-muted">
          Scan the barcode, look up an ISBN, or enter it by hand.
        </p>
      </header>

      {/* Mode switch */}
      <div className="inline-flex rounded-xl border-[2.5px] border-outline bg-surface-2 p-1">
        {([
          { key: "scan", label: "Scan / ISBN", icon: ScanLine },
          { key: "manual", label: "Manual", icon: Keyboard },
        ] as const).map((m) => (
          <button
            key={m.key}
            onClick={() => {
              setMode(m.key);
              if (m.key === "manual") {
                setValue((v) => v ?? emptyBookInput());
                setScanning(false);
              } else {
                setScanning(true);
                setValue(null);
              }
            }}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 font-bold transition",
              mode === m.key ? "bg-riso-blue text-white" : "text-text-muted",
            )}
          >
            <m.icon className="h-4 w-4" /> {m.label}
          </button>
        ))}
      </div>

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
          {value && !batch && (
            <div className="card p-5">
              <BookForm value={value} onChange={setValue} />
              <button className="btn-primary mt-5 w-full" onClick={saveForm} disabled={add.isPending}>
                {add.isPending ? "Saving…" : "Add to library"}
              </button>
            </div>
          )}
        </div>
      )}

      {mode === "manual" && value && (
        <div className="card max-w-2xl p-5">
          <BookForm value={value} onChange={setValue} />
          <button className="btn-primary mt-5 w-full" onClick={saveForm} disabled={add.isPending}>
            {add.isPending ? "Saving…" : "Add to library"}
          </button>
        </div>
      )}
    </div>
  );
}
