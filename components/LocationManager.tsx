"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, CornerDownRight } from "lucide-react";
import {
  useLocations,
  useUpsertLocation,
  useDeleteLocation,
} from "@/lib/queries";
import { locationOptions, buildPathMap, PATH_SEP } from "@/lib/locations";

// Nested location manager: add a place under any parent, see the full tree.
export function LocationManager() {
  const { data: locations = [] } = useLocations();
  const upsert = useUpsertLocation();
  const del = useDeleteLocation();
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");

  const paths = buildPathMap(locations);
  const ordered = locationOptions(locations);

  async function add() {
    if (!name.trim()) return;
    await upsert.mutateAsync({ name: name.trim(), parent_id: parent || null });
    setName("");
    toast.success("Location added");
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-xl border-2 border-outline bg-surface-2 p-3">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="e.g. Study, Tall shelf, Row 2"
        />
        <div className="flex gap-2">
          <select className="select" value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">Top level</option>
            {ordered.map((o) => (
              <option key={o.id} value={o.id}>
                inside {o.label}
              </option>
            ))}
          </select>
          <button className="btn-primary shrink-0" onClick={add}>
            <Plus className="h-5 w-5" /> Add
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
            return (
              <li
                key={o.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2"
                style={{ paddingLeft: `${depth * 18 + 8}px` }}
              >
                {depth > 0 && <CornerDownRight className="h-4 w-4 text-text-muted" />}
                <span className="flex-1 text-sm font-semibold">{leaf}</span>
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
