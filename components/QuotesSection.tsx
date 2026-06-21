"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Quote as QuoteIcon, Plus, Trash2 } from "lucide-react";
import { useBookQuotes, useAddQuote, useDeleteQuote } from "@/lib/queries";

// Capture + show favourite passages for a book (a little commonplace book).
export function QuotesSection({ bookId }: { bookId: string }) {
  const { data: quotes = [] } = useBookQuotes(bookId);
  const add = useAddQuote();
  const del = useDeleteQuote();

  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [page, setPage] = useState("");

  async function save() {
    if (!text.trim()) return toast.error("Add the quote text");
    try {
      await add.mutateAsync({
        book_id: bookId,
        text: text.trim(),
        page: page ? Number(page) : null,
        note: null,
      });
      setText("");
      setPage("");
      setAdding(false);
      toast.success("Quote saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    }
  }

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
          <QuoteIcon className="h-5 w-5 text-riso-purple" /> Quotes &amp; highlights
        </h2>
        {!adding && (
          <button className="chip" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-4 space-y-2 rounded-xl border-2 border-outline bg-surface-2 p-3">
          <textarea
            className="textarea"
            rows={3}
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="“A line worth keeping…”"
          />
          <div className="flex items-center gap-2">
            <input
              className="input w-28"
              type="number"
              inputMode="numeric"
              value={page}
              onChange={(e) => setPage(e.target.value)}
              placeholder="Page"
            />
            <button className="btn-primary ml-auto" onClick={save} disabled={add.isPending}>
              {add.isPending ? "Saving…" : "Save quote"}
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                setAdding(false);
                setText("");
                setPage("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {quotes.length === 0 ? (
        !adding && (
          <p className="text-sm text-text-muted">
            No quotes yet. Save a favourite line as you read.
          </p>
        )
      ) : (
        <ul className="space-y-3">
          {quotes.map((q) => (
            <li
              key={q.id}
              className="relative rounded-xl border-l-4 border-riso-purple bg-surface-2 py-2.5 pl-4 pr-10"
            >
              <p className="font-display text-[0.95rem] italic leading-snug">
                “{q.text}”
              </p>
              {q.page != null && (
                <p className="mt-1 text-xs font-semibold text-text-muted">
                  p. {q.page}
                </p>
              )}
              <button
                onClick={() => del.mutate(q.id)}
                aria-label="Delete quote"
                className="absolute right-2 top-2 rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-riso-pink"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
