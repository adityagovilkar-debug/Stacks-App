"use client";

import type { Book } from "./types";

// Tiny event buses so any button (header, FAB, cards, empty states) can open
// the shared dialogs that live in the AppShell.

export const LOG_SESSION_EVENT = "stacks:log-session";
export const EDIT_BOOK_EVENT = "stacks:edit-book";
export const COMMAND_EVENT = "stacks:command";

export interface LogSessionDetail {
  book?: Pick<Book, "id" | "title" | "page_count" | "current_page">;
}
export interface EditBookDetail {
  book?: Book; // present = edit existing, absent = blank (rare; use /add)
}

export function openLogSession(book?: LogSessionDetail["book"]) {
  window.dispatchEvent(
    new CustomEvent<LogSessionDetail>(LOG_SESSION_EVENT, { detail: { book } }),
  );
}

export function openEditBook(book?: Book) {
  window.dispatchEvent(
    new CustomEvent<EditBookDetail>(EDIT_BOOK_EVENT, { detail: { book } }),
  );
}

export function openCommand() {
  window.dispatchEvent(new CustomEvent(COMMAND_EVENT));
}
