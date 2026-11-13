"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "./Dialog";
import { ASK_EVENT, type AskDetail } from "@/lib/ask";
import { cn } from "@/lib/utils";

// The one sheet behind confirmSheet / promptSheet / chooseSheet. On a phone
// it slides up from the bottom (Dialog does that); on desktop it's centred.
export function AskSheet() {
  const [req, setReq] = useState<AskDetail | null>(null);
  const [text, setText] = useState("");
  const [choice, setChoice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onAsk(e: Event) {
      const d = (e as CustomEvent<AskDetail>).detail;
      setText(d.opts.input?.initial ?? "");
      setChoice(d.opts.choices?.[0]?.value ?? "");
      setReq(d);
    }
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  }, []);

  useEffect(() => {
    if (req?.opts.input) setTimeout(() => inputRef.current?.focus(), 40);
  }, [req]);

  if (!req) return null;
  const { opts } = req;
  const picked = opts.choices?.find((c) => c.value === choice);
  const danger = opts.danger || picked?.danger;

  function finish(ok: boolean) {
    if (!req) return;
    if (ok && opts.input && !text.trim()) return; // nothing typed
    req.resolve(
      ok ? { ok: true, value: opts.input ? text.trim() : opts.choices ? choice : undefined } : { ok: false },
    );
    setReq(null);
  }

  return (
    <Dialog
      open
      onClose={() => finish(false)}
      title={opts.title}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-outline" onClick={() => finish(false)}>
            {opts.cancelLabel ?? "Cancel"}
          </button>
          <button
            className={danger ? "btn-danger" : "btn-primary"}
            onClick={() => finish(true)}
            disabled={!!opts.input && !text.trim()}
          >
            {opts.confirmLabel ?? "OK"}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {opts.body && <p className="whitespace-pre-line text-sm text-text-muted">{opts.body}</p>}

        {opts.input && (
          <div>
            {opts.input.label && <label className="label">{opts.input.label}</label>}
            <input
              ref={inputRef}
              className="input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && finish(true)}
              placeholder={opts.input.placeholder}
            />
          </div>
        )}

        {opts.choices && (
          <div className="space-y-2" role="radiogroup" aria-label={opts.title}>
            {opts.choices.map((c) => {
              const on = c.value === choice;
              return (
                <button
                  key={c.value}
                  role="radio"
                  aria-checked={on}
                  onClick={() => setChoice(c.value)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border-[2.5px] border-outline p-3 text-left transition",
                    on ? "bg-riso-yellow/25 pop-sm" : "bg-surface",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 h-5 w-5 shrink-0 rounded-full border-[2.5px] border-outline",
                      on && "bg-riso-blue shadow-[inset_0_0_0_3px_var(--surface)]",
                    )}
                  />
                  <span>
                    <span className={cn("block font-display font-bold", c.danger && "text-riso-pink")}>
                      {c.label}
                    </span>
                    {c.hint && <span className="block text-xs text-text-muted">{c.hint}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Dialog>
  );
}
