"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import type { IScannerControls } from "@zxing/browser";
import { CameraOff } from "lucide-react";

// Live ISBN barcode scanner. Decodes EAN-13 / EAN-8 / UPC from the rear
// camera and fires onDetected with the raw code. Debounces so the same book
// isn't fired repeatedly while the barcode sits in frame.
export function IsbnScanner({
  active,
  onDetected,
}: {
  active: boolean;
  onDetected: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setError(null);

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
    ]);
    const reader = new BrowserMultiFormatReader(hints);

    (async () => {
      try {
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current!,
          (result) => {
            if (!result) return;
            const code = result.getText();
            const now = Date.now();
            // ignore the same code within 2.5s
            if (code === lastRef.current.code && now - lastRef.current.at < 2500)
              return;
            lastRef.current = { code, at: now };
            onDetected(code);
          },
        );
        if (cancelled) controls.stop();
        else controlsRef.current = controls;
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Couldn't start the camera. Check permissions.",
        );
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [active, onDetected]);

  if (error) {
    return (
      <div className="card-soft flex flex-col items-center gap-2 px-4 py-8 text-center text-text-muted">
        <CameraOff className="h-8 w-8" />
        <p className="text-sm font-semibold">{error}</p>
        <p className="text-xs">
          Camera access needs HTTPS (or localhost). You can type the ISBN
          instead.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border-[2.5px] border-outline bg-black">
      <video
        ref={videoRef}
        className="aspect-[4/3] w-full object-cover"
        muted
        playsInline
      />
      {/* scan frame */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-24 w-3/4 rounded-lg border-[3px] border-dashed border-riso-yellow/90" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[#1a1430]/70 px-3 py-1.5 text-center text-xs font-semibold text-white">
        Point at the barcode on the back cover
      </div>
    </div>
  );
}
