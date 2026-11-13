"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Photograph a page, tap the lines you want, and they become the quote text.
// Text recognition runs in the browser (tesseract.js, loaded on first use —
// the English model downloads once, then the phone caches it). The photo
// itself is never uploaded or stored.
export function PhotoQuote({ onPick }: { onPick: (text: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [lines, setLines] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());

  async function shrink(file: File): Promise<HTMLCanvasElement> {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  async function onFile(file: File) {
    setStatus("Reading the page…");
    setLines(null);
    setPicked(new Set());
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text")
            setStatus(`Reading the page… ${Math.round(m.progress * 100)}%`);
          else if (m.status.startsWith("loading"))
            setStatus("Getting text recognition ready (first time only)…");
        },
      });
      const { data } = await worker.recognize(await shrink(file));
      await worker.terminate();
      const out = data.text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 1);
      if (!out.length) toast.error("Couldn't find any text. Try a closer, sharper photo.");
      setLines(out.length ? out : null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read the photo");
    } finally {
      setStatus(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function toggle(i: number) {
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }

  function use() {
    const chosen = [...picked].sort((a, b) => a - b).map((i) => lines![i]);
    // Join lines; mend words hyphenated across a line break.
    const text = chosen.reduce(
      (acc, l) => (acc.endsWith("-") ? acc.slice(0, -1) + l : acc ? `${acc} ${l}` : l),
      "",
    );
    onPick(text);
    setLines(null);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="chip"
        onClick={() => fileRef.current?.click()}
        disabled={!!status}
      >
        {status ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        {status ?? "From a photo"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      {lines && (
        <div className="rounded-xl border-2 border-outline bg-surface p-2">
          <p className="mb-1.5 px-1 text-xs font-bold text-text-muted">
            Tap the lines to keep, then “Use these”.
          </p>
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {lines.map((l, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className={cn(
                    "w-full rounded-lg px-2 py-1.5 text-left text-sm transition",
                    picked.has(i) ? "bg-riso-purple/20 font-semibold" : "hover:bg-surface-2",
                  )}
                >
                  {l}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn-primary h-10 min-h-0" disabled={!picked.size} onClick={use}>
              Use these
            </button>
            <button type="button" className="btn-ghost h-10 min-h-0" onClick={() => setLines(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
