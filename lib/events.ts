"use client";

import type { Book } from "./types";

// Tiny event buses so any button (header, FAB, cards, empty states) can open
// the shared dialogs that live in the AppShell.

export const LOG_SESSION_EVENT = "stacks:log-session";
export const EDIT_BOOK_EVENT = "stacks:edit-book";
export const COMMAND_EVENT = "stacks:command";
export const TIMER_EVENT = "stacks:timer";

export interface LogSessionDetail {
  book?: { id: string; title: string };
  minutes?: number; // pre-fill (e.g. from the reading timer)
}
export interface EditBookDetail {
  book?: Book; // present = edit existing, absent = blank (rare; use /add)
}
export interface TimerDetail {
  book: { id: string; title: string };
}

export function openLogSession(book?: LogSessionDetail["book"], minutes?: number) {
  window.dispatchEvent(
    new CustomEvent<LogSessionDetail>(LOG_SESSION_EVENT, { detail: { book, minutes } }),
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

// Start a reading timer for a book (handled in AppShell).
export function startTimer(book: { id: string; title: string }) {
  window.dispatchEvent(new CustomEvent<TimerDetail>(TIMER_EVENT, { detail: { book } }));
}
