"use client";

// Export everything you have in Stacks to one JSON file, export the library as
// a spreadsheet-friendly CSV, and restore from a JSON backup.
//
// Restore is a merge: rows in the backup are written back (replacing the same
// rows if they still exist); nothing currently in the app is deleted.

import { supabaseBrowser } from "@/lib/supabase/browser";
import { fetchAll } from "@/lib/queries";
import { buildPathMap } from "@/lib/locations";
import type { Book, Collection, Location } from "@/lib/types";

const sb = supabaseBrowser;

// In restore order (parents before children).
const TABLES = [
  "locations",
  "tags",
  "collections",
  "books",
  "book_tags",
  "collection_books",
  "reading_sessions",
  "quotes",
  "saved_views",
  "loans",
  "read_throughs",
  "book_notes",
  "recommendations",
] as const;
type TableName = (typeof TABLES)[number];

const KEYS: Record<TableName, string[]> = {
  locations: ["id"],
  tags: ["id"],
  collections: ["id"],
  books: ["id"],
  book_tags: ["book_id", "tag_id"],
  collection_books: ["collection_id", "book_id"],
  reading_sessions: ["id"],
  quotes: ["id"],
  saved_views: ["id"],
  loans: ["id"],
  read_throughs: ["id"],
  book_notes: ["id"],
  recommendations: ["id"],
};

type Row = Record<string, unknown>;

export interface Backup {
  app: "stacks";
  version: 1;
  exported_at: string;
  profile: Row | null;
  tables: Partial<Record<TableName, Row[]>>;
}

export async function exportAll(): Promise<{ backup: Backup; skipped: string[] }> {
  const tables: Backup["tables"] = {};
  const skipped: string[] = [];
  for (const t of TABLES) {
    try {
      tables[t] = await fetchAll<Row>(() => {
        let q = sb().from(t).select("*");
        for (const k of KEYS[t]) q = q.order(k);
        return q;
      });
    } catch {
      skipped.push(t); // e.g. a table whose migration hasn't been run
    }
  }
  const { data: profile } = await sb().from("profiles").select("*").maybeSingle();
  return {
    backup: {
      app: "stacks",
      version: 1,
      exported_at: new Date().toISOString(),
      profile: (profile as Row) ?? null,
      tables,
    },
    skipped,
  };
}

export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---- CSV -------------------------------------------------------------
function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function booksToCsv(
  books: Book[],
  locations: Location[],
  collections: Collection[],
): string {
  const paths = buildPathMap(locations);
  const colName = new Map(collections.map((c) => [c.id, c.name]));
  const header = [
    "Title",
    "Subtitle",
    "Authors",
    "ISBN-13",
    "ISBN-10",
    "Publisher",
    "Year",
    "Pages",
    "Kindle locations",
    "Format",
    "Status",
    "Times read",
    "Rating",
    "Started",
    "Finished",
    "Ownership",
    "Location",
    "Series",
    "Series #",
    "Tags",
    "Collections",
    "Favourite",
    "Review",
  ];
  const rows = books.map((b) => [
    b.title,
    b.subtitle,
    b.authors.join("; "),
    b.isbn13,
    b.isbn10,
    b.publisher,
    b.published_year,
    b.page_count,
    b.total_locations,
    b.format,
    b.read_status,
    b.times_read,
    b.rating,
    b.started_on,
    b.finished_on,
    b.ownership,
    b.location_id ? paths.get(b.location_id) : "",
    b.series_name,
    b.series_index,
    (b.tags ?? []).map((t) => t.name).join("; "),
    (b.collection_ids ?? []).map((id) => colName.get(id) ?? "").filter(Boolean).join("; "),
    b.favorite ? "yes" : "",
    b.review,
  ]);
  // BOM so Excel reads the accents and em dashes correctly.
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

// ---- Restore ---------------------------------------------------------
export function parseBackup(text: string): Backup {
  let b: Backup;
  try {
    b = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (b?.app !== "stacks" || !b.tables) throw new Error("That isn't a Stacks backup file.");
  return b;
}

// Parents first, so nested locations restore cleanly.
function orderLocations(rows: Row[]): Row[] {
  const byId = new Map(rows.map((r) => [r.id as string, r]));
  const out: Row[] = [];
  const done = new Set<string>();
  const visit = (r: Row, depth = 0) => {
    const id = r.id as string;
    if (done.has(id) || depth > 50) return;
    const parent = r.parent_id ? byId.get(r.parent_id as string) : undefined;
    if (parent) visit(parent, depth + 1);
    done.add(id);
    out.push(r);
  };
  rows.forEach((r) => visit(r));
  return out;
}

export async function restoreBackup(
  backup: Backup,
  onProgress?: (msg: string) => void,
): Promise<Record<string, number>> {
  const {
    data: { session },
  } = await sb().auth.getSession();
  const user_id = session?.user?.id;
  if (!user_id) throw new Error("Not signed in");

  // Tags are unique per (kind, name). A fresh account already has the starter
  // genre tags, so match backup tags onto existing ones by name.
  const { data: existingTags } = await sb().from("tags").select("id, kind, name");
  const tagByName = new Map(
    (existingTags ?? []).map((t) => [`${t.kind}|${String(t.name).toLowerCase()}`, t.id as string]),
  );
  const tagRemap = new Map<string, string>();

  const counts: Record<string, number> = {};
  for (const t of TABLES) {
    let rows = backup.tables[t];
    if (!rows?.length) continue;
    onProgress?.(`Restoring ${t.replace(/_/g, " ")}…`);

    if (t === "locations") rows = orderLocations(rows);
    if (t === "tags") {
      rows = rows.filter((r) => {
        const existing = tagByName.get(`${r.kind}|${String(r.name).toLowerCase()}`);
        if (existing && existing !== r.id) {
          tagRemap.set(r.id as string, existing);
          return false;
        }
        return true;
      });
    }
    if (t === "book_tags") {
      const seen = new Set<string>();
      rows = rows
        .map((r): Row => ({ ...r, tag_id: tagRemap.get(r.tag_id as string) ?? r.tag_id }))
        .filter((r) => {
          const k = `${r.book_id}|${r.tag_id}`;
          return seen.has(k) ? false : (seen.add(k), true);
        });
    }

    rows = rows.map((r) => ({ ...r, user_id }));
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await sb()
        .from(t)
        .upsert(chunk, { onConflict: KEYS[t].join(",") });
      if (error) throw new Error(`Couldn't restore ${t.replace(/_/g, " ")}: ${error.message}`);
    }
    counts[t] = rows.length;
  }

  if (backup.profile) {
    const p = backup.profile;
    await sb()
      .from("profiles")
      .update({
        full_name: p.full_name,
        goal_books_per_year: p.goal_books_per_year,
        goal_pages_per_day: p.goal_pages_per_day,
        goal_minutes_per_day: p.goal_minutes_per_day,
      })
      .eq("id", user_id);
  }
  return counts;
}
