"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { useTags, useUpsertTag, useDeleteTag } from "@/lib/queries";
import {
  PALETTE,
  PALETTE_KEYS,
  TAG_KIND_LABEL,
  palette,
  type PaletteKey,
  type Tag,
  type TagKind,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const KINDS: TagKind[] = ["genre", "mood", "theme", "tag"];

export function TagManager() {
  const { data: tags = [] } = useTags();
  const upsert = useUpsertTag();
  const del = useDeleteTag();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<TagKind>("genre");
  const [color, setColor] = useState<PaletteKey>("blue");
  const [editingId, setEditingId] = useState<string | null>(null);

  function startEdit(t: Tag) {
    setEditingId(t.id);
    setName(t.name);
    setKind(t.kind);
    setColor(t.color);
  }
  function reset() {
    setEditingId(null);
    setName("");
  }

  async function save() {
    if (!name.trim()) return;
    await upsert.mutateAsync({
      id: editingId ?? undefined,
      name: name.trim(),
      kind,
      color,
    });
    toast.success(editingId ? "Tag updated" : "Tag added");
    reset();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-xl border-2 border-outline bg-surface-2 p-3">
        {editingId && (
          <p className="text-xs font-bold uppercase tracking-wide text-riso-blue">
            Editing tag
          </p>
        )}
        <div className="flex gap-2">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder={editingId ? "Tag name" : "New tag name"}
          />
          <select
            className="select w-auto"
            value={kind}
            onChange={(e) => setKind(e.target.value as TagKind)}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {TAG_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {PALETTE_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setColor(k)}
                aria-label={PALETTE[k].label}
                className={cn(
                  "h-7 w-7 rounded-full border-2",
                  PALETTE[k].dot,
                  color === k
                    ? "border-outline ring-2 ring-offset-1 ring-outline"
                    : "border-outline/40",
                )}
              />
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            {editingId && (
              <button className="btn-ghost" onClick={reset}>
                <X className="h-4 w-4" /> Cancel
              </button>
            )}
            <button className="btn-primary shrink-0" onClick={save} disabled={upsert.isPending}>
              {editingId ? "Save" : (<><Plus className="h-5 w-5" /> Add</>)}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {KINDS.map((k) => {
          const group = tags.filter((t) => t.kind === k);
          if (!group.length) return null;
          return (
            <div key={k}>
              <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
                {TAG_KIND_LABEL[k]}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.map((t) => {
                  const p = palette(t.color);
                  return (
                    <span
                      key={t.id}
                      className={cn(
                        "chip",
                        p.chip,
                        editingId === t.id && "ring-2 ring-riso-blue",
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full", p.dot)} />
                      {t.name}
                      <button
                        onClick={() => startEdit(t)}
                        aria-label={`Edit ${t.name}`}
                        className="ml-0.5 text-text-muted hover:text-riso-blue"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete the “${t.name}” tag? It will be removed from all books.`))
                            del.mutate(t.id);
                        }}
                        aria-label={`Delete ${t.name}`}
                        className="text-text-muted hover:text-riso-pink"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
