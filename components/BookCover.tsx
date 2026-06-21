"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const RISO = ["#ff4f9a", "#0b63f6", "#ffd23f", "#ff6f3c", "#7b5cff"];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// A book cover: shows the fetched image, or a generated risograph placeholder
// (colored block + halftone + the title) when there's no cover / it fails.
export function BookCover({
  title,
  authors,
  coverUrl,
  className,
}: {
  title: string;
  authors?: string[] | null;
  coverUrl?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = coverUrl && !failed;

  const color = RISO[hash(title) % RISO.length];
  const dark = color === "#ffd23f"; // yellow needs dark text

  return (
    <div
      className={cn(
        "relative aspect-[2/3] w-full overflow-hidden rounded-lg border-[2.5px] border-outline bg-surface-2",
        className,
      )}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl!}
          alt={title}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="halftone flex h-full w-full flex-col justify-between p-2.5"
          style={{ backgroundColor: color }}
        >
          <div
            className={cn(
              "font-display text-[0.95rem] font-extrabold leading-tight line-clamp-5",
              dark ? "text-[#1a1430]" : "text-white",
            )}
          >
            {title}
          </div>
          {authors?.length ? (
            <div
              className={cn(
                "text-[0.7rem] font-semibold line-clamp-2",
                dark ? "text-[#1a1430]/80" : "text-white/85",
              )}
            >
              {authors.join(", ")}
            </div>
          ) : null}
        </div>
      )}
      {/* spine line */}
      <div className="pointer-events-none absolute inset-y-0 left-[6px] w-[2px] bg-black/15" />
    </div>
  );
}
