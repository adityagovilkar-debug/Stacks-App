"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Share2, Download } from "lucide-react";
import type { Wrapped } from "@/lib/wrapped";

// A shareable image summarising the reading year — drawn to a canvas so it can
// go straight to the Android share sheet (as a PNG file) or be downloaded.
export function WrappedShareCard({ year, w }: { year: number; w: Wrapped }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canShareFile, setCanShareFile] = useState(false);

  useEffect(() => {
    draw(canvasRef.current, year, w);
  }, [year, w]);

  useEffect(() => {
    // Probe file-sharing support with a tiny dummy file.
    try {
      const f = new File(["x"], "x.png", { type: "image/png" });
      setCanShareFile(
        typeof navigator !== "undefined" &&
          !!navigator.canShare &&
          navigator.canShare({ files: [f] }),
      );
    } catch {
      setCanShareFile(false);
    }
  }, []);

  function toBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const c = canvasRef.current;
      if (!c) return resolve(null);
      c.toBlob((b) => resolve(b), "image/png");
    });
  }

  async function onShare() {
    const blob = await toBlob();
    if (!blob) return;
    const file = new File([blob], `stacks-${year}.png`, { type: "image/png" });
    const data = {
      files: [file],
      title: `${year} in books`,
      text: `My ${year} reading, wrapped 📚`,
    };
    if (navigator.canShare && navigator.canShare(data) && navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    download(blob);
  }

  async function onDownload() {
    const blob = await toBlob();
    if (blob) download(blob);
  }

  function download(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stacks-${year}.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Saved the card as an image");
  }

  return (
    <section className="card p-5">
      <h2 className="mb-3 font-display text-lg font-extrabold">Share your year</h2>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <canvas
          ref={canvasRef}
          width={1080}
          height={1350}
          className="w-full max-w-[260px] rounded-xl border-[2.5px] border-outline"
        />
        <div className="flex-1 space-y-2">
          <p className="text-sm text-text-muted">
            A little card of your {year} reading — perfect for sending to friends
            or posting.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={onShare}>
              <Share2 className="h-5 w-5" /> {canShareFile ? "Share card" : "Save card"}
            </button>
            <button className="btn-outline" onClick={onDownload}>
              <Download className="h-5 w-5" /> Download
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- Canvas drawing --------------------------------------------------------
const INK = "#1a1430";
const PINK = "#ff4f9a";
const YELLOW = "#ffd23f";

function draw(canvas: HTMLCanvasElement | null, year: number, w: Wrapped) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;

  // Background
  ctx.fillStyle = PINK;
  ctx.fillRect(0, 0, W, H);

  // Halftone dots (printed texture)
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  for (let y = 40; y < H; y += 34) {
    for (let x = 40; x < W; x += 34) {
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Inner ink frame
  ctx.strokeStyle = INK;
  ctx.lineWidth = 10;
  ctx.strokeRect(46, 46, W - 92, H - 92);

  ctx.textAlign = "center";
  const cx = W / 2;

  // Eyebrow
  ctx.fillStyle = INK;
  ctx.font = "700 40px system-ui, sans-serif";
  ctx.fillText("STACKS · YEAR IN BOOKS", cx, 180);

  // Year
  ctx.font = "800 150px system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(year), cx, 340);

  // Big number
  ctx.fillStyle = INK;
  ctx.font = "800 320px system-ui, sans-serif";
  ctx.fillText(String(w.booksFinished), cx, 660);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 54px system-ui, sans-serif";
  ctx.fillText(w.booksFinished === 1 ? "book finished" : "books finished", cx, 730);

  // Stat chips (2×2)
  const stats: [string, string][] = [
    [w.pagesRead.toLocaleString(), "pages"],
    [`${Math.round(w.minutes / 60)}h`, "reading"],
    [String(w.daysRead), "days read"],
    [w.avgRating ? w.avgRating.toFixed(1) : "—", "avg rating"],
  ];
  const bw = 420;
  const bh = 150;
  const gap = 40;
  const startX = cx - bw - gap / 2;
  const startY = 810;
  stats.forEach(([val, label], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = startX + col * (bw + gap);
    const y = startY + row * (bh + gap);
    ctx.fillStyle = YELLOW;
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.strokeRect(x, y, bw, bh);
    ctx.fillStyle = INK;
    ctx.textAlign = "left";
    ctx.font = "800 76px system-ui, sans-serif";
    ctx.fillText(val, x + 28, y + 82);
    ctx.font = "700 34px system-ui, sans-serif";
    ctx.fillText(label, x + 28, y + 126);
  });

  // Top genres line
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 40px system-ui, sans-serif";
  const genres = w.topGenres.slice(0, 3).map((g) => g.name).join(" · ");
  if (genres) ctx.fillText(genres, cx, 1240);

  // Footer
  ctx.fillStyle = INK;
  ctx.font = "700 34px system-ui, sans-serif";
  ctx.fillText("— my Stacks library —", cx, 1300);
}
