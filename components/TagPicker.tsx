"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTags, useUpsertTag } from "@/lib/queries";
import { TAG_KIND_LABEL, palette, type TagKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const KINDS: TagKind[] = ["genre", "mood", "theme", "tag"];

// Multi-select tag chips grouped by kind, with inline "create tag".
export function TagPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { data: tags = [] } = useTags();
  const upsert = useUpsertTag();
  const [adding, setAdding] = useState<TagKind | null>(null);
  const [name, setName] = useState("");

  const toggle = (id: string) =>
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );

  async function createTag(kind: TagKind) {
    const n = name.trim();
    if (!n) return;
    const id = await upsert.mutateAsync({ name: n, kind, color: "slate" });
    onChange([...selected, id as string]);
    setName("");
    setAdding(null);
  }

  return (
    <div className="space-y-3">
      {KINDS.map((kind) => {
        const group = tags.filter((t) => t.kind === kind);
        return (
          <div key={kind}>
            <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
              {TAG_KIND_LABEL[kind]}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {group.map((t) => {
                const on = selected.includes(t.id);
                const p = palette(t.color);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    className={cn(
                      "chip transition",
                      on ? p.chip : "opacity-60 hover:opacity-100",
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", p.dot)} />
                    {t.name}
                  </button>
                );
              })}
              {adding === kind ? (
                <span className="inline-flex items-center gap-1">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        createTag(kind);
                      }
                      if (e.key === "Escape") setAdding(null);
                    }}
                    placeholder={`New ${TAG_KIND_LABEL[kind].toLowerCase()}`}
                    className="h-8 w-32 rounded-full border-2 border-outline bg-surface px-3 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => createTag(kind)}
                    className="chip bg-riso-blue/15"
                  >
                    Add
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAdding(kind);
                    setName("");
                  }}
                  className="chip border-dashed text-text-muted"
                >
                  <Plus className="h-3 w-3" /> New
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
