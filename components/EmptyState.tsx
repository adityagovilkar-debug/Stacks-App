import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card-soft flex flex-col items-center justify-center border-dashed px-6 py-14 text-center">
      <div className="mb-4 flex h-16 w-16 rotate-[-4deg] items-center justify-center rounded-2xl border-[2.5px] border-outline bg-riso-yellow/30 text-text pop-sm">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-extrabold">{title}</h3>
      {hint && <p className="mt-1.5 max-w-xs text-base text-text-muted">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
