"use client";

import { useState } from "react";
import { useCollections, useLocations } from "@/lib/queries";
import { locationOptions } from "@/lib/locations";
import { BookCover } from "./BookCover";
import { RatingStars } from "./RatingStars";
import { TagPicker } from "./TagPicker";
import { BookClassificationField } from "./BookClassificationField";
import {
  FORMAT_LABEL,
  OWNERSHIP_LABEL,
  READ_STATUS_LABEL,
  palette,
  type BookFormat,
  type BookInput,
  type Ownership,
  type ReadStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="font-display text-sm font-extrabold uppercase tracking-wide text-riso-blue">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

// The full create/edit form. Controlled: the parent owns the BookInput so it
// can pre-fill from an ISBN lookup.
export function BookForm({
  value,
  onChange,
}: {
  value: BookInput;
  onChange: (v: BookInput) => void;
}) {
  const { data: locations = [] } = useLocations();
  const { data: collections = [] } = useCollections();
  const [authorsText, setAuthorsText] = useState(value.authors.join(", "));

  const set = <K extends keyof BookInput>(key: K, v: BookInput[K]) =>
    onChange({ ...value, [key]: v });

  const num = (s: string): number | null => (s.trim() === "" ? null : Number(s));

  return (
    <div className="space-y-6">
      {/* Identity */}
      <Section title="The book">
        <div className="flex gap-4">
          <div className="w-24 shrink-0">
            <BookCover
              title={value.title || "Untitled"}
              authors={value.authors}
              coverUrl={value.cover_url}
            />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                value={value.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Book title"
              />
            </div>
            <div>
              <label className="label">Subtitle</label>
              <input
                className="input"
                value={value.subtitle ?? ""}
                onChange={(e) => set("subtitle", e.target.value || null)}
              />
            </div>
          </div>
        </div>
        <div>
          <label className="label">Author(s)</label>
          <input
            className="input"
            value={authorsText}
            onChange={(e) => {
              setAuthorsText(e.target.value);
              set(
                "authors",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              );
            }}
            placeholder="Separate multiple authors with commas"
          />
        </div>
        <div>
          <label className="label">Cover image URL</label>
          <input
            className="input"
            value={value.cover_url ?? ""}
            onChange={(e) => set("cover_url", e.target.value || null)}
            placeholder="https://…"
          />
        </div>
      </Section>

      {/* Details */}
      <Section title="Details">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">ISBN-13</label>
            <input
              className="input"
              value={value.isbn13 ?? ""}
              onChange={(e) => set("isbn13", e.target.value || null)}
            />
          </div>
          <div>
            <label className="label">ISBN-10</label>
            <input
              className="input"
              value={value.isbn10 ?? ""}
              onChange={(e) => set("isbn10", e.target.value || null)}
            />
          </div>
          <div>
            <label className="label">Publisher</label>
            <input
              className="input"
              value={value.publisher ?? ""}
              onChange={(e) => set("publisher", e.target.value || null)}
            />
          </div>
          <div>
            <label className="label">Year</label>
            <input
              className="input"
              type="number"
              value={value.published_year ?? ""}
              onChange={(e) => set("published_year", num(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Pages</label>
            <input
              className="input"
              type="number"
              value={value.page_count ?? ""}
              onChange={(e) => set("page_count", num(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Language</label>
            <input
              className="input"
              value={value.language ?? ""}
              onChange={(e) => set("language", e.target.value || null)}
              placeholder="en"
            />
          </div>
          <div>
            <label className="label">Format</label>
            <select
              className="select"
              value={value.format ?? ""}
              onChange={(e) =>
                set("format", (e.target.value || null) as BookFormat | null)
              }
            >
              <option value="">—</option>
              {(Object.keys(FORMAT_LABEL) as BookFormat[]).map((f) => (
                <option key={f} value={f}>
                  {FORMAT_LABEL[f]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Series</label>
            <input
              className="input"
              value={value.series_name ?? ""}
              onChange={(e) => set("series_name", e.target.value || null)}
              placeholder="Series name"
            />
          </div>
          <div>
            <label className="label">Series #</label>
            <input
              className="input"
              type="number"
              step="0.5"
              value={value.series_index ?? ""}
              onChange={(e) => set("series_index", num(e.target.value))}
            />
          </div>
        </div>
      </Section>

      {/* Classification */}
      <Section title="Classify it (every way you like)">
        <BookClassificationField
          system={value.classification_system}
          classification={value.classification}
          code={value.classification_code}
          onChange={(system, label, code) =>
            onChange({
              ...value,
              classification_system: system,
              classification: label,
              classification_code: code,
            })
          }
        />
        <TagPicker
          selected={value.tag_ids}
          onChange={(ids) => set("tag_ids", ids)}
        />
        {collections.length > 0 && (
          <div>
            <label className="label">Collections</label>
            <div className="flex flex-wrap gap-1.5">
              {collections.map((c) => {
                const on = value.collection_ids.includes(c.id);
                const p = palette(c.color);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      set(
                        "collection_ids",
                        on
                          ? value.collection_ids.filter((x) => x !== c.id)
                          : [...value.collection_ids, c.id],
                      )
                    }
                    className={cn("chip transition", on ? p.chip : "opacity-60")}
                  >
                    <span className={cn("h-2 w-2 rounded-full", p.dot)} />
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      {/* Shelf & ownership */}
      <Section title="Where it lives">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ownership</label>
            <select
              className="select"
              value={value.ownership}
              onChange={(e) => set("ownership", e.target.value as Ownership)}
            >
              {(Object.keys(OWNERSHIP_LABEL) as Ownership[]).map((o) => (
                <option key={o} value={o}>
                  {OWNERSHIP_LABEL[o]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Location</label>
            <select
              className="select"
              value={value.location_id ?? ""}
              onChange={(e) => set("location_id", e.target.value || null)}
            >
              <option value="">—</option>
              {locationOptions(locations).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Condition</label>
            <input
              className="input"
              value={value.condition ?? ""}
              onChange={(e) => set("condition", e.target.value || null)}
              placeholder="New, good, worn…"
            />
          </div>
          <div>
            <label className="label">Acquired on</label>
            <input
              className="input"
              type="date"
              value={value.acquired_on ?? ""}
              onChange={(e) => set("acquired_on", e.target.value || null)}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Source</label>
            <input
              className="input"
              value={value.source ?? ""}
              onChange={(e) => set("source", e.target.value || null)}
              placeholder="Bought, gift, inherited…"
            />
          </div>
        </div>
      </Section>

      {/* Reading */}
      <Section title="Reading">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Status</label>
            <select
              className="select"
              value={value.read_status}
              onChange={(e) => set("read_status", e.target.value as ReadStatus)}
            >
              {(Object.keys(READ_STATUS_LABEL) as ReadStatus[]).map((s) => (
                <option key={s} value={s}>
                  {READ_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Your rating</label>
            <div className="flex h-11 items-center gap-3">
              <RatingStars
                value={value.rating}
                onChange={(v) => set("rating", v)}
              />
              <label className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={value.favorite}
                  onChange={(e) => set("favorite", e.target.checked)}
                  className="h-4 w-4 accent-riso-pink"
                />
                Favorite
              </label>
            </div>
          </div>
        </div>
        <div>
          <label className="label">Review / notes</label>
          <textarea
            className="textarea"
            rows={3}
            value={value.review ?? ""}
            onChange={(e) => set("review", e.target.value || null)}
            placeholder="What did you think?"
          />
        </div>
      </Section>

      {/* Description */}
      <Section title="Description">
        <textarea
          className="textarea"
          rows={4}
          value={value.description ?? ""}
          onChange={(e) => set("description", e.target.value || null)}
          placeholder="The blurb / synopsis"
        />
      </Section>
    </div>
  );
}
