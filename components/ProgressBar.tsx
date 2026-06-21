import { cn } from "@/lib/utils";

// Outlined risograph progress bar.
export function ProgressBar({
  percent,
  className,
  color = "var(--color-riso-blue)",
  height = 12,
}: {
  percent: number;
  className?: string;
  color?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full border-2 border-outline bg-surface-2",
        className,
      )}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}
