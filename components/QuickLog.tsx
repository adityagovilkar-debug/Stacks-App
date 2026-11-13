"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { useLogSession } from "@/lib/queries";
import { openFinishBook } from "@/lib/events";
import { isAudiobook, isLocationEbook, todayISO } from "@/lib/stats";
import type { Book } from "@/lib/types";

// "I read today": type where you are now, tap ✓. Works out how much you read
// from your bookmark. The full log sheet is still there for minutes, notes,
// other dates.
export function QuickLog({ book, wide = false }: { book: Book; wide?: boolean }) {
  const log = useLogSession();
  const [value, setValue] = useState("");

  const audio = isAudiobook(book);
  const loc = isLocationEbook(book);
  const current = (audio ? book.audio_position_minutes : loc ? book.current_location : book.current_page) ?? 0;
  const total = audio ? book.duration_minutes : loc ? book.total_locations : book.page_count;
  const label = audio ? "Now at min" : loc ? "Now at loc." : "Now on page";

  async function save() {
    const end = Number(value);
    if (!value || !Number.isFinite(end)) return;
    if (end <= current) {
      toast.error(`That's not past your bookmark (${current}). Use “Log reading” to fix it.`);
      return;
    }
    const delta = end - current;
    try {
      await log.mutateAsync({
        book_id: book.id,
        happened_on: todayISO(),
        pages_read: audio || loc ? 0 : delta,
        minutes: audio ? delta : null,
        end_page: !audio && !loc ? end : null,
        end_position_minutes: audio ? end : null,
        locations_read: loc ? delta : null,
        end_location: loc ? end : null,
        note: null,
      });
      setValue("");
      toast.success(
        audio
          ? `+${delta} min listened 🔥`
          : loc
            ? `+${delta.toLocaleString()} locations 🔥`
            : `+${delta} pages 🔥`,
      );
      if (total && end >= total) openFinishBook(book);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't log that");
    }
  }

  return (
    <form
      className={wide ? "flex items-center gap-2" : "mt-2 flex items-center gap-1.5"}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <input
        className={wide ? "input h-11 min-h-0 w-full px-3 py-1" : "input h-9 min-h-0 w-full max-w-[9rem] px-2.5 py-1 text-sm"}
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={label}
        aria-label={label}
      />
      <button
        type="submit"
        disabled={!value || log.isPending}
        aria-label="Log it"
        className={(wide ? "h-11 w-11" : "h-9 w-9") + " flex shrink-0 items-center justify-center rounded-lg border-2 border-outline bg-riso-yellow text-[#1a1430] pop-sm disabled:opacity-40"}
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </button>
    </form>
  );
}
