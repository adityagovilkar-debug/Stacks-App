"use client";

// Riso replacements for the browser's confirm() / prompt(). Any component can
// `await confirmSheet({...})`; the sheet itself lives in the AppShell.

export const ASK_EVENT = "stacks:ask";

export interface AskChoice {
  value: string;
  label: string;
  hint?: string;
  danger?: boolean;
}

export interface AskOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean; // confirm button in pink
  input?: { label?: string; placeholder?: string; initial?: string };
  choices?: AskChoice[]; // pick one (first is the default)
}

export interface AskResult {
  ok: boolean;
  value?: string; // typed text, or the chosen choice's value
}

export interface AskDetail {
  opts: AskOptions;
  resolve: (r: AskResult) => void;
}

export function ask(opts: AskOptions): Promise<AskResult> {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent<AskDetail>(ASK_EVENT, { detail: { opts, resolve } }));
  });
}

export async function confirmSheet(opts: AskOptions): Promise<boolean> {
  return (await ask(opts)).ok;
}

export async function promptSheet(opts: AskOptions): Promise<string | null> {
  const r = await ask({ ...opts, input: opts.input ?? {} });
  return r.ok ? (r.value ?? "") : null;
}

export async function chooseSheet(opts: AskOptions): Promise<string | null> {
  const r = await ask(opts);
  return r.ok ? (r.value ?? null) : null;
}
