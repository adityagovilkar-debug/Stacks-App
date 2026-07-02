"use client";

import { useState } from "react";
import {
  GENRE_TAXONOMY,
  DEWEY_CLASSES,
  type ClassificationSystem,
} from "@/lib/bookClassification";
import { cn } from "@/lib/utils";

const MODES: { key: ClassificationSystem; label: string }[] = [
  { key: "genre", label: "Genre" },
  { key: "dewey", label: "Dewey" },
  { key: "custom", label: "Custom" },
];

// Structured shelf classification: pick a genre, a Dewey number, or free text.
// Emits (system, label, code) — code is the Dewey number when applicable.
export function BookClassificationField({
  system,
  classification,
  code,
  onChange,
}: {
  system: "genre" | "dewey" | "custom" | null;
  classification: string | null;
  code: string | null;
  onChange: (
    system: "genre" | "dewey" | "custom" | null,
    label: string | null,
    code: string | null,
  ) => void;
}) {
  const [mode, setMode] = useState<ClassificationSystem>(system ?? "genre");

  // Follow external changes to `system` (e.g. the form was refilled for a
  // different book) so the toggle never shows a stale mode.
  const [prevSystem, setPrevSystem] = useState(system);
  if (system !== prevSystem) {
    setPrevSystem(system);
    if (system && system !== mode) setMode(system);
  }

  // For Dewey: which top class is selected (derive from code prefix).
  const deweyClass = code ? code[0] + "00" : "";

  return (
    <div className="space-y-2">
      <div className="inline-flex rounded-lg border-2 border-outline bg-surface-2 p-0.5">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => {
              setMode(m.key);
              onChange(m.key, null, null);
            }}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-bold transition",
              mode === m.key ? "bg-riso-blue text-white" : "text-text-muted",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "genre" && (
        <select
          className="select"
          value={classification ?? ""}
          onChange={(e) =>
            onChange("genre", e.target.value || null, null)
          }
        >
          <option value="">— Pick a genre —</option>
          {GENRE_TAXONOMY.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.items.map((it) => (
                <option key={it} value={it}>
                  {it}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      )}

      {mode === "dewey" && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select
            className="select"
            value={deweyClass}
            onChange={(e) => {
              const cls = DEWEY_CLASSES.find((c) => c.code === e.target.value);
              if (cls) onChange("dewey", `${cls.code} ${cls.label}`, cls.code);
              else onChange("dewey", null, null);
            }}
          >
            <option value="">— Class —</option>
            {DEWEY_CLASSES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.label}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={code ?? ""}
            disabled={!deweyClass}
            onChange={(e) => {
              const cls = DEWEY_CLASSES.find((c) => c.code === deweyClass);
              const div = cls?.divisions.find((d) => d.code === e.target.value);
              if (div) onChange("dewey", `${div.code} ${div.label}`, div.code);
            }}
          >
            <option value="">— Division —</option>
            {DEWEY_CLASSES.find((c) => c.code === deweyClass)?.divisions.map(
              (d) => (
                <option key={d.code} value={d.code}>
                  {d.code} · {d.label}
                </option>
              ),
            )}
          </select>
        </div>
      )}

      {mode === "custom" && (
        <input
          className="input"
          placeholder="e.g. Top shelf, signed first editions"
          value={classification ?? ""}
          onChange={(e) => onChange("custom", e.target.value || null, null)}
        />
      )}
    </div>
  );
}
