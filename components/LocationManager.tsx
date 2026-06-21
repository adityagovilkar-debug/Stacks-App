"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, CornerDownRight } from "lucide-react";
import {
  useLocations,
  useUpsertLocation,
  useDeleteLocation,
} from "@/lib/queries";
import { locationOptions, buildPathMap, PATH_SEP } from "@/lib/locations";
import type { Location } from "@/lib/types";
import { cn } from "@/lib/utils";

// Nested location manager: add, rename, re-parent, or remove places.
export function LocationManager() {
  const { data: locations = [] } = useLocations();
  const upsert = useUpsertLocation();
  const del = useDeleteLocation();
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const byId = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const paths = buildPathMap(locations);
  const ordered = locationOptions(locations);

  // When editing, a place can't become a child of itself or its descendants.
  function isDescendant(id: string, ancestorId: string): boolean {
    let cur = byId.get(id)?.parent_id ?? null;
    const seen = new Set<string>();
    while (cur) {
      if (cur === ancestorId) return true;
      if (seen.has(cur)) break;
      seen.add(cur);
      cur = byId.get(cur)?.parent_id ?? null;
    }
    return false;
  }
  const parentOptions = editingId
    ? ordered.filter((o) => o.id !== editingId && !isDescendant(o.id, editingId))
    : ordered;

  function startEdit(l: Location) {
    setEditingId(l.id);
    setName(l.name);
    setParent(l.parent_id ?? "");
  }
  function reset() {
    setEditingId(null);
    setName("");
    setParent("");
  }

  async function save() {
    if (!name.trim()) return;
    await upsert.mutateAsync({
      id: editingId ?? undefined,
      name: name.trim(),
      parent_id: parent || null,
    });
    toast.success(editingId ? "Location updated" : "Location added");
    reset();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-xl border-2 border-outline bg-surface-2 p-3">
        {editingId && (
          <p className="text-xs font-bold uppercase tracking-wide text-riso-blue">
            Editing location
          </p>
        )}
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="e.g. Study, Tall shelf, Row 2"
        />
        <div className="flex gap-2">
          <select className="select" value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">Top level</option>
            {parentOptions.map((o) => (
              <option key={o.id} value={o.id}>
                inside {o.label}
              </option>
            ))}
          </select>
          {editingId && (
            <button className="btn-ghost shrink-0" onClick={reset}>
              <X className="h-4 w-4" /> Cancel
            </button>
          )}
          <button className="btn-primary shrink-0" onClick={save} disabled={upsert.isPending}>
            {editingId ? "Save" : (<><Plus className="h-5 w-5" /> Add</>)}
          </button>
        </div>
      </div>

      {ordered.length === 0 ? (
        <p className="text-sm text-text-muted">No locations yet.</p>
      ) : (
        <ul className="space-y-1">
          {ordered.map((o) => {
            const depth = (paths.get(o.id)?.split(PATH_SEP).length ?? 1) - 1;
            const leaf = o.label.split(PATH_SEP).pop();
            const loc = byId.get(o.id);
            return (
              <li
                key={o.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2",
                  editingId === o.id && "bg-surface-2 ring-2 ring-riso-blue",
                )}
                style={{ paddingLeft: `${depth * 18 + 8}px` }}
              >
                {depth > 0 && <CornerDownRight className="h-4 w-4 text-text-muted" />}
                <span className="flex-1 text-sm font-semibold">{leaf}</span>
                {loc && (
                  <button
                    onClick={() => startEdit(loc)}
                    aria-label={`Edit ${leaf}`}
                    className="rounded p-1 text-text-muted hover:text-riso-blue"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm(`Delete “${leaf}”? Books here become unshelved.`))
                      del.mutate(o.id);
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
