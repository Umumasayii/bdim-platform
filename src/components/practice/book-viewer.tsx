"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Lock, ShoppingCart, X } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";

export type ViewerFile =
  | { title: string; url: string; full: true; downloadUrl: string }
  | { title: string; url: string; full: false; pages: number; totalPages: number; price: string };

/** Lazily loads pdf.js (only when someone opens a book). */
async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs;
}

/** One page drawn when it scrolls near the screen. */
function Page({ doc, number, width }: { doc: PDFDocumentProxy; number: number; width: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(1.414);
  const [visible, setVisible] = useState(number <= 2);

  useEffect(() => {
    const el = holder.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !width) return;
    let cancelled = false;
    let task: { cancel: () => void } | null = null;
    void (async () => {
      const page = await doc.getPage(number);
      if (cancelled || !canvas.current) return;
      const base = page.getViewport({ scale: 1 });
      setRatio(base.height / base.width);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (width / base.width) * dpr });
      const c = canvas.current;
      c.width = Math.floor(viewport.width);
      c.height = Math.floor(viewport.height);
      const render = page.render({ canvasContext: c.getContext("2d")!, viewport });
      task = render;
      await render.promise.catch(() => undefined);
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, number, width, visible]);

  return (
    <div ref={holder} className="mx-auto overflow-hidden rounded-md bg-white shadow-md" style={{ width, height: width * ratio }}>
      <canvas ref={canvas} className="block size-full" aria-label={`Page ${number}`} />
    </div>
  );
}

/** Full-screen reader. Free books: every page + Download. Paid previews: first pages, then a "buy" card. */
export function BookViewer({ file, onClose, onBuy }: { file: ViewerFile; onClose: () => void; onBuy?: () => void }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let task: { destroy: () => Promise<void> } | null = null;
    let cancelled = false;
    void (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const loading = pdfjs.getDocument({ url: file.url });
        task = loading;
        const d = await loading.promise;
        if (!cancelled) setDoc(d);
      } catch {
        if (!cancelled) setError("This file couldn't be displayed. You can still download it.");
      }
    })();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [file.url]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setWidth(Math.min(el.clientWidth - 24, 900));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const pageCount = doc?.numPages ?? 0;

  return (
    <div role="dialog" aria-modal="true" aria-label={file.title} className="fixed inset-0 z-[60] flex flex-col bg-[#0b1220]/95 backdrop-blur-sm">
      <header className="flex items-center gap-3 border-b border-white/10 px-3 py-2.5 text-white sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{file.title}</p>
          <p className="text-xs text-white/60">
            {file.full
              ? pageCount
                ? `${pageCount} pages`
                : "Loading…"
              : `Preview · first ${file.pages} of ${file.totalPages || "?"} pages`}
          </p>
        </div>
        {file.full ? (
          <a href={file.downloadUrl} className="inline-flex h-9 items-center gap-2 rounded-xl bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700">
            <Download className="size-4" aria-hidden /> <span className="hidden sm:inline">Download</span>
          </a>
        ) : onBuy ? (
          <button type="button" onClick={onBuy} className="inline-flex h-9 items-center gap-2 rounded-xl bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700">
            <ShoppingCart className="size-4" aria-hidden /> <span className="hidden sm:inline">Buy · {file.price}</span>
          </button>
        ) : null}
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white">
          <X className="size-5" aria-hidden />
        </button>
      </header>

      <div ref={scroller} className="flex-1 overflow-y-auto overscroll-contain px-3 py-5">
        {error ? (
          <p className="mx-auto max-w-md rounded-xl bg-white/10 p-4 text-center text-sm text-white">{error}</p>
        ) : !doc || !width ? (
          <p className="mt-16 text-center text-sm text-white/70">Opening the book…</p>
        ) : (
          <div className="grid justify-center gap-4">
            {Array.from({ length: pageCount }, (_, i) => (
              <Page key={i} doc={doc} number={i + 1} width={width} />
            ))}
            {!file.full ? (
              <div className="mx-auto grid max-w-md place-items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.06] p-6 text-center text-white" style={{ width }}>
                <span className="grid size-12 place-items-center rounded-full bg-teal-600/20 text-teal-300">
                  <Lock className="size-6" aria-hidden />
                </span>
                <p className="text-lg font-bold">End of the free preview</p>
                <p className="text-sm text-white/70">
                  You&apos;ve read {file.pages} of {file.totalPages || "the"} pages. Buy the book to unlock the full version and download it.
                </p>
                {onBuy ? (
                  <button type="button" onClick={onBuy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700">
                    <ShoppingCart className="size-4" aria-hidden /> Buy · {file.price}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
