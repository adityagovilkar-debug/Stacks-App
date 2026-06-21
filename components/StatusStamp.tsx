import { cn } from "@/lib/utils";
import type { ReadStatus } from "@/lib/types";

const STYLES: Record<ReadStatus, { label: string; cls: string; rot: string }> = {
  read: { label: "Read", cls: "text-riso-blue bg-riso-blue/10", rot: "-rotate-3" },
  reading: { label: "Reading", cls: "text-riso-orange bg-riso-orange/10", rot: "rotate-2" },
  on_hold: { label: "On hold", cls: "text-riso-purple bg-riso-purple/10", rot: "rotate-1" },
  unread: { label: "Unread", cls: "text-text-muted bg-surface-2", rot: "-rotate-2" },
};

// Rubber-stamp status badge. Shows "Read ×N" when read multiple times.
export function StatusStamp({
  status,
  timesRead,
  className,
}: {
  status: ReadStatus;
  timesRead?: number;
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span className={cn("stamp", s.cls, s.rot, className)}>
      {s.label}
      {status === "read" && (timesRead ?? 0) > 1 ? ` ×${timesRead}` : ""}
    </span>
  );
}
