"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Share2, MessageCircle, Mail, X } from "lucide-react";
import { shareBooks, whatsappHref, mailtoHref } from "@/lib/share";
import type { Book } from "@/lib/types";

// Floating action bar for the library's "select & share" mode. Primary action
// is the native share sheet (Android → WhatsApp / Gmail / …); WhatsApp + Email
// shortcuts and a clipboard fallback keep it working everywhere.
export function ShareBar({ books, onClear }: { books: Book[]; onClear: () => void }) {
  const count = books.length;
  const none = count === 0;

  // navigator.share is only known client-side; decide after mount.
  const [canNativeShare, setCanNativeShare] = useState(false);
  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  async function onShare() {
    const r = await shareBooks(books);
    if (r === "copied") toast.success("Copied — paste it anywhere");
    else if (r === "unsupported") toast.error("Sharing isn't available here");
    // "shared" / "cancelled" need no toast (the OS sheet handled it)
  }

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 lg:bottom-6">
      <div className="flex w-full max-w-lg items-center gap-2 rounded-2xl border-[2.5px] border-outline bg-surface px-3 py-2.5 pop">
        <span className="ml-1 font-display text-sm font-extrabold">
          {none ? "None selected" : `${count} selected`}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <a
            href={none ? undefined : whatsappHref(books)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on WhatsApp"
            className={`rounded-lg border-2 border-outline bg-surface p-2 text-text pop-sm ${
              none ? "pointer-events-none opacity-40" : ""
            }`}
          >
            <MessageCircle className="h-5 w-5" />
          </a>
          <a
            href={none ? undefined : mailtoHref(books)}
            aria-label="Share by email"
            className={`rounded-lg border-2 border-outline bg-surface p-2 text-text pop-sm ${
              none ? "pointer-events-none opacity-40" : ""
            }`}
          >
            <Mail className="h-5 w-5" />
          </a>
          <button
            onClick={onShare}
            disabled={none}
            className="btn-primary h-10 min-h-0 px-3 py-0"
          >
            <Share2 className="h-5 w-5" />
            {canNativeShare ? "Share" : "Copy"}
          </button>
          {!none && (
            <button
              onClick={onClear}
              aria-label="Clear selection"
              className="rounded-lg p-2 text-text-muted hover:bg-surface-2 hover:text-text"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
