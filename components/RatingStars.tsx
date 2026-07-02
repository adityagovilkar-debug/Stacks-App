"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Star rating that supports half-steps. Read-only by default; pass onChange to
// make it interactive (each star has a left half = .5 and right half = full).
export function RatingStars({
  value,
  onChange,
  size = 22,
  className,
}: {
  value: number | null;
  onChange?: (v: number | null) => void; // null = rating cleared
  size?: number;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  const interactive = !!onChange;

  return (
    <div
      className={cn("relative inline-flex", className)}
      onMouseLeave={() => setHover(null)}
    >
      {/* base outlines */}
      <div className="flex" style={{ gap: 2 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            width={size}
            height={size}
            className="text-outline/40"
            strokeWidth={2}
          />
        ))}
      </div>
      {/* filled overlay, clipped to the rating width */}
      <div
        className="pointer-events-none absolute inset-0 flex overflow-hidden"
        style={{ width: `${(shown / 5) * 100}%`, gap: 2 }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            width={size}
            height={size}
            className="shrink-0 fill-riso-yellow text-outline"
            strokeWidth={2}
          />
        ))}
      </div>
      {/* interactive hit areas (two per star) */}
      {interactive && (
        <div className="absolute inset-0 flex" style={{ gap: 2 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex" style={{ width: size, height: size }}>
              {[0.5, 1].map((frac) => {
                const v = i + frac;
                return (
                  <button
                    key={frac}
                    type="button"
                    aria-label={`Rate ${v}`}
                    onMouseEnter={() => setHover(v)}
                    onClick={() => onChange?.(value === v ? null : v)}
                    className="h-full w-1/2 cursor-pointer"
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
