"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Upload, Loader2 } from "lucide-react";
import { useBooks, useCollections, useLocations } from "@/lib/queries";
import {
  booksToCsv,
  downloadFile,
  exportAll,
  parseBackup,
  restoreBackup,
} from "@/lib/backup";
import { todayISO } from "@/lib/stats";
import { confirmSheet } from "@/lib/ask";

// Settings → Backup: everything to one JSON file, the library as CSV, and
// restoring from a JSON backup.
export function BackupSection() {
  const qc = useQueryClient();
  const { data: books = [] } = useBooks();
  const { data: locations = [] } = useLocations();
  const { data: collections = [] } = useCollections();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function onExport() {
    setBusy("Exporting…");
    try {
      const { backup, skipped } = await exportAll();
      downloadFile(`stacks-backup-${todayISO()}.json`, JSON.stringify(backup), "application/json");
      const n = backup.tables.books?.length ?? 0;
      toast.success(`Backup saved — ${n} book${n === 1 ? "" : "s"} and all their history`);
      if (skipped.length)
        toast(`Skipped (not set up yet): ${skipped.join(", ")}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  function onCsv() {
    downloadFile(
      `stacks-library-${todayISO()}.csv`,
      booksToCsv(books, locations, collections),
      "text/csv;charset=utf-8",
    );
    toast.success(`Saved ${books.length} books as CSV`);
  }

  async function onRestoreFile(file: File) {
    try {
      const backup = parseBackup(await file.text());
      const n = backup.tables.books?.length ?? 0;
      const when = backup.exported_at?.slice(0, 10) ?? "unknown date";
      if (
        !(await confirmSheet({
          title: `Restore the backup from ${when}?`,
          body:
            `It holds ${n} books. Everything in it is written back into Stacks. Books, sessions and ` +
            "reads that are in both the backup and the app are replaced by the backup's version. " +
            "Nothing that is only in the app is deleted.",
          confirmLabel: "Restore",
        }))
      )
        return;
      setBusy("Restoring…");
      const counts = await restoreBackup(backup, (m) => setBusy(m));
      await qc.invalidateQueries();
      toast.success(
        `Restored ${counts.books ?? 0} books, ${counts.reading_sessions ?? 0} sessions, ${counts.read_throughs ?? 0} reads`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        Keep a copy of your whole library — books, reading history, reads,
        quotes, loans, shelves and settings — in one file.
      </p>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={onExport} disabled={!!busy}>
          <Download className="h-5 w-5" /> Export everything
        </button>
        <button className="btn-outline" onClick={onCsv} disabled={!!busy || !books.length}>
          <FileSpreadsheet className="h-5 w-5" /> Library as CSV
        </button>
        <button className="btn-outline" onClick={() => fileRef.current?.click()} disabled={!!busy}>
          <Upload className="h-5 w-5" /> Restore from backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onRestoreFile(f);
          }}
        />
      </div>
      {busy && (
        <p className="flex items-center gap-2 text-sm font-semibold text-riso-blue">
          <Loader2 className="h-4 w-4 animate-spin" /> {busy}
        </p>
      )}
    </div>
  );
}
