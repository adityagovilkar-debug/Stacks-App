"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  useCollections,
  useUpsertCollection,
  useDeleteCollection,
} from "@/lib/queries";
import { PALETTE, PALETTE_KEYS, palette, type PaletteKey } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CollectionManager() {
  const { data: collections = [] } = useCollections();
  const upsert = useUpsertCollection();
  const del = useDeleteCollection();
  const [name, setName] = useState("");
  const [color, setColor] = useState<PaletteKey>("pink");

  async function add() {
    if (!name.trim()) return;
    await upsert.mutateAsync({ name: name.trim(), color });
    setName("");
    toast.success("Collection added");
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-xl border-2 border-outline bg-surface-2 p-3">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="e.g. Signed copies, To re-read"
        />
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
                  color === k ? "border-outline ring-2 ring-offset-1 ring-outline" : "border-outline/40",
                )}
              />
            ))}
          </div>
          <button className="btn-primary ml-auto shrink-0" onClick={add}>
            <Plus className="h-5 w-5" /> Add
          </button>
        </div>
      </div>

      {collections.length === 0 ? (
        <p className="text-sm text-text-muted">No collections yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {collections.map((c) => {
            const p = palette(c.color);
            return (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded-lg border-2 border-outline bg-surface px-3 py-2"
              >
                <span className={cn("h-3 w-3 rounded-full", p.dot)} />
                <span className="flex-1 text-sm font-bold">{c.name}</span>
                <button
                  onClick={() => {
                    if (confirm(`Delete the “${c.name}” collection?`)) del.mutate(c.id);
                  }}
                  aria-label="Delete"
                  className="rounded p-1 text-text-muted hover:text-riso-pink"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
