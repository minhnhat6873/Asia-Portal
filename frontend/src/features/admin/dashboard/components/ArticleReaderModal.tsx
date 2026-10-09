"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar, Download, FileText, Focus, Maximize2, Minimize2, Moon,
  Pause, Play, Printer, RotateCcw, Sun, X, ZoomIn, ZoomOut,
} from "lucide-react";

import { RichText } from "@/components/ui/RichText";
import type { MediaPost } from "../types";

interface Props {
  post: MediaPost;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showAdminActions?: boolean;
}

const ZOOM_LEVELS = [80, 90, 100, 110, 125, 150, 175, 200] as const;
const SPEEDS = [20, 40, 70] as const;
const SPEED_LABELS = ["Chậm", "Vừa", "Nhanh"] as const;

function tooltip(label: string) {
  return { title: label, "aria-label": label };
}

async function printArticleFrame(source: HTMLElement, title: string, paperSize: "A4" | "Letter") {
  const frame = document.createElement("iframe");
  frame.setAttribute("title", "Bản in bài viết");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;left:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(frame);

  const frameDocument = frame.contentDocument;
  const frameWindow = frame.contentWindow;
  if (!frameDocument || !frameWindow) {
    frame.remove();
    return;
  }

  frameDocument.open();
  frameDocument.write("<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"></head><body></body></html>");
  frameDocument.close();
  frameDocument.title = title;

  const cssLinks = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
  const cssLoads = cssLinks.map((sourceLink) => new Promise<void>((resolve) => {
    const link = frameDocument.createElement("link");
    link.rel = "stylesheet";
    link.href = sourceLink.href;
    link.media = sourceLink.media || "all";
    link.onload = () => resolve();
    link.onerror = () => resolve();
    frameDocument.head.appendChild(link);
  }));
  document.querySelectorAll("style").forEach((sourceStyle) => {
    const style = frameDocument.createElement("style");
    style.textContent = sourceStyle.textContent;
    frameDocument.head.appendChild(style);
  });

  const printStyle = frameDocument.createElement("style");
  printStyle.textContent = `
    @page { size: ${paperSize}; margin: 5mm 5mm 3mm; }
    html, body { margin: 0; padding: 0; background: #fff; color: #111827; font-family: Arial, sans-serif; }
    [data-reader-print-root] { display: block; width: 100%; max-width: none; min-height: 0; margin: 0; padding: 5mm 0 0; overflow: visible; box-shadow: none; background: #fff; }
    img { max-width: 100%; height: auto; break-inside: avoid; }
    p, blockquote, table { break-inside: avoid; }
  `;
  frameDocument.head.appendChild(printStyle);
  const printContent = source.cloneNode(true) as HTMLElement;
  frameDocument.body.appendChild(printContent);

  const imageLoads = Array.from(frameDocument.images).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => resolve(), { once: true });
  }));
  await Promise.all([
    Promise.all(cssLoads),
    Promise.all(imageLoads),
    frameDocument.fonts?.ready.then(() => undefined).catch(() => undefined) ?? Promise.resolve(),
  ]);

  let cleanupTimer = 0;
  const cleanup = () => {
    window.clearTimeout(cleanupTimer);
    frameWindow.removeEventListener("afterprint", cleanup);
    frame.remove();
  };
  frameWindow.addEventListener("afterprint", cleanup, { once: true });
  cleanupTimer = window.setTimeout(cleanup, 60_000);
  frameWindow.focus();
  frameWindow.print();
}

export function ArticleReaderModal({ post, onClose, onEdit, onDelete, showAdminActions = true }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const closeRef = useRef(onClose);

  const [zoom, setZoom] = useState<number>(100);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCssFullscreen, setIsCssFullscreen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isFocus, setIsFocus] = useState(false);
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [paperSize, setPaperSize] = useState<"A4" | "Letter">("A4");
  const [progress, setProgress] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  closeRef.current = onClose;
  const stopAutoScroll = useCallback(() => {
    setIsAutoScrolling(false);
    lastFrameRef.current = null;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  const scrollToPosition = useCallback((top: number, behavior: ScrollBehavior = "smooth") => {
    const container = scrollRef.current;
    if (!container) return;
    const max = Math.max(0, container.scrollHeight - container.clientHeight);
    container.scrollTo({ top: Math.max(0, Math.min(top, max)), behavior: isReducedMotion ? "auto" : behavior });
  }, [isReducedMotion]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setIsReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const update = () => {
      const max = container.scrollHeight - container.clientHeight;
      setProgress(max > 0 ? (container.scrollTop / max) * 100 : 0);
    };
    update();
    container.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(container);
    if (articleRef.current) resize.observe(articleRef.current);
    return () => {
      container.removeEventListener("scroll", update);
      resize.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isAutoScrolling || isReducedMotion) {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      lastFrameRef.current = null;
      if (isReducedMotion) setIsAutoScrolling(false);
      return;
    }
    const tick = (now: number) => {
      const container = scrollRef.current;
      if (!container) return;
      if (lastFrameRef.current !== null) {
        const elapsedSeconds = Math.min((now - lastFrameRef.current) / 1000, 0.1);
        container.scrollTop += SPEEDS[speedIndex] * elapsedSeconds;
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 1) {
          setProgress(100);
          setIsAutoScrolling(false);
          frameRef.current = null;
          lastFrameRef.current = null;
          return;
        }
      }
      lastFrameRef.current = now;
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      lastFrameRef.current = null;
    };
  }, [isAutoScrolling, isReducedMotion, speedIndex]);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === panelRef.current);
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isPrintPreview) {
        event.preventDefault();
        setIsPrintPreview(false);
      } else if (document.fullscreenElement === panelRef.current) {
        event.preventDefault();
        void document.exitFullscreen();
      } else if (isCssFullscreen) {
        event.preventDefault();
        setIsCssFullscreen(false);
      } else {
        closeRef.current();
      }
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("keydown", keydown);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (document.fullscreenElement === panelRef.current) void document.exitFullscreen().catch(() => undefined);
      document.body.classList.remove("article-reader-printing");
    };
  }, [isCssFullscreen, isPrintPreview]);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement === panelRef.current) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }
    if (isCssFullscreen) {
      setIsCssFullscreen(false);
      return;
    }
    try {
      if (!panelRef.current?.requestFullscreen) throw new Error("Fullscreen API unavailable");
      await panelRef.current.requestFullscreen();
    } catch {
      setIsCssFullscreen(true);
    }
  };

  const pauseForManualScroll = () => {
    if (isAutoScrolling) stopAutoScroll();
  };

  const printArticle = () => {
    stopAutoScroll();
    setIsPrintPreview(true);
  };

  const openPrintDialog = () => {
    const printContent = document.querySelector<HTMLElement>("[data-reader-print-root]");
    if (printContent) void printArticleFrame(printContent, post.title, paperSize);
  };

  return isMounted ? createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-2 transition-colors sm:p-4 ${isDark ? "bg-slate-950/90" : "bg-slate-950/60"}`} data-reader-overlay>
      <style>{`
        .reader-dark .reader-copy, .reader-dark .reader-copy *:not(img):not(svg) { color: #e2e8f0 !important; }
        .reader-dark .reader-copy *:not(img):not(svg) { background-color: transparent !important; border-color: #475569 !important; }
        .reader-dark .reader-copy blockquote { border-left: 3px solid #34d399 !important; }
        .reader-dark .reader-copy a { color: #6ee7b7 !important; text-decoration: underline; }
        .reader-copy img { max-width: 100%; height: auto; }
        [data-reader-print-header] { display: none; }
        @media print {
          @page { size: ${paperSize}; margin: 5mm 5mm 3mm; }
          body.article-reader-printing { background: #fff !important; }
          body.article-reader-printing * { visibility: hidden !important; }
          body.article-reader-printing [data-reader-print-root], body.article-reader-printing [data-reader-print-root] * { visibility: visible !important; }
          body.article-reader-printing [data-reader-overlay] { position: static !important; display: block !important; padding: 0 !important; background: #fff !important; }
          body.article-reader-printing [data-reader-print-preview] { position: static !important; display: block !important; width: 100% !important; height: auto !important; max-width: none !important; overflow: visible !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: #fff !important; }
          body.article-reader-printing [data-reader-print-preview-toolbar] { display: none !important; }
          body.article-reader-printing [data-reader-print-stage] { display: block !important; height: auto !important; overflow: visible !important; padding: 0 !important; }
          body.article-reader-printing [data-reader-print-root] { position: static !important; display: block !important; width: 100% !important; max-width: none !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; border: 0 !important; box-shadow: none !important; background: #fff !important; }
          body.article-reader-printing [data-reader-panel] { position: static !important; width: 100% !important; height: auto !important; max-height: none !important; max-width: none !important; overflow: visible !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: #fff !important; color: #111827 !important; }
          body.article-reader-printing [data-reader-scroll] { display: block !important; height: auto !important; min-height: 0 !important; overflow: visible !important; }
          body.article-reader-printing [data-reader-header], body.article-reader-printing [data-reader-progress] { display: none !important; }
          body.article-reader-printing [data-reader-print-header] { display: flex !important; align-items: center; gap: 14px; margin: 0 0 18px; padding: 0 0 12px; border-bottom: 2px solid #15803d; color: #123b2a !important; }
          body.article-reader-printing [data-reader-print-header] img { display: block !important; width: 58px !important; height: 58px !important; object-fit: contain; }
          body.article-reader-printing [data-reader-print-header] strong { display: block; font-size: 17pt; line-height: 1.2; color: #14532d !important; }
          body.article-reader-printing [data-reader-print-header] span { display: block; margin-top: 4px; font-size: 9pt; letter-spacing: .08em; color: #64748b !important; }
          body.article-reader-printing [data-reader-page] { zoom: 1 !important; width: 100% !important; max-width: none !important; }
          body.article-reader-printing [data-reader-toolbar], body.article-reader-printing [data-reader-close], body.article-reader-printing [data-reader-actions] { display: none !important; }
          body.article-reader-printing [data-reader-cover] { display: block !important; max-height: 70mm; object-fit: contain; break-inside: avoid; }
          body.article-reader-printing .reader-summary, body.article-reader-printing .reader-date { display: block !important; }
          body.article-reader-printing .reader-copy { overflow: visible !important; background: #fff !important; color: #111827 !important; }
          body.article-reader-printing .reader-copy *:not(img):not(svg) { color: #111827 !important; background-color: transparent !important; }
          body.article-reader-printing img { max-width: 100% !important; break-inside: avoid; }
          body.article-reader-printing p, body.article-reader-printing blockquote, body.article-reader-printing table { break-inside: avoid; }
        }
      `}</style>
          {isPrintPreview ? (
            <div role="dialog" aria-modal="true" aria-label="Xem trước khi in" className="relative z-[110] flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-100 text-slate-900 shadow-2xl" data-reader-print-preview>
              <div data-reader-print-preview-toolbar className="z-10 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 shadow-sm sm:px-6">
                <div className="min-w-44">
                  <h2 className="text-sm font-bold">Xem trước khi in</h2>
                  <p className="text-xs text-slate-500">Kiểm tra nội dung trước khi in hoặc lưu PDF</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium shadow-sm">
                    <FileText className="h-4 w-4 text-slate-600" />
                    <select aria-label="Khổ giấy" value={paperSize} onChange={(event) => setPaperSize(event.target.value as "A4" | "Letter")} className="bg-transparent outline-none">
                      <option value="A4">A4 (210 × 297 mm)</option>
                      <option value="Letter">Letter (8.5 × 11 in)</option>
                    </select>
                  </label>
                  <button type="button" onClick={openPrintDialog} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"><Printer className="h-4 w-4" />In</button>
                  <button type="button" onClick={openPrintDialog} title="Trong hộp thoại in, chọn Save as PDF hoặc Microsoft Print to PDF" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-50"><Download className="h-4 w-4" />Tải PDF</button>
                  <button type="button" onClick={() => setIsPrintPreview(false)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-50"><X className="h-4 w-4" />Đóng</button>
                </div>
              </div>
              <div data-reader-print-stage className="min-h-0 flex-1 overflow-auto px-3 py-5 sm:px-8 sm:py-8">
                <div data-reader-print-root className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-[17mm] py-[14mm] shadow-xl print:shadow-none">
                  <div className="relative mx-[5mm] flex items-center justify-center border-b-2 border-emerald-700 pb-[calc(0.75rem+3mm)]">
                    <img src="/assets/images/asia-logo.png" alt="Asia F&B" className="absolute left-0 h-[20mm] w-[20mm] object-contain" />
                    <div className="px-[22mm] text-center" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                      <h1 className="text-base font-black uppercase tracking-wide text-emerald-950 sm:text-lg">Công ty Cổ phần Thực phẩm và Đồ uống Á Châu</h1>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">Asia F&amp;B Beverage Joint Stock Company</p>
                    </div>
                  </div>
                  <article className="pt-5">
                    {post.coverImage && <img src={post.coverImage} alt={post.title} className="mb-4 mt-2 max-h-[110mm] w-full object-contain" />}
                    <h2 className="mb-2 text-2xl font-black leading-tight text-slate-900">{post.title}</h2>
                    <p className="mb-4 text-xs text-slate-500">Ngày đăng: {post.publishDate}</p>
                    <RichText html={post.summary} className="rich-content mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm italic leading-6 text-emerald-950" />
                    <RichText html={post.content} className="reader-copy rich-content text-sm leading-6 text-slate-800" />
                  </article>
                </div>
              </div>
            </div>
          ) : <section
        ref={panelRef}
        data-reader-panel
        role="dialog"
        aria-modal="true"
        aria-label={`Bài viết: ${post.title}`}
        className={`flex ${isCssFullscreen ? "fixed inset-0 z-[100] h-screen max-h-none w-screen max-w-none rounded-none" : showAdminActions ? "h-[92vh] max-h-[100vh] max-w-5xl" : "h-auto max-h-[86vh] max-w-4xl translate-y-[4vh]"} w-full flex-col overflow-hidden rounded-3xl border shadow-2xl transition-colors bg-white text-slate-900`}
      >
        <header data-reader-header className="shrink-0 border-b border-slate-200/80 bg-inherit">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>Trình đọc bài viết</p>
              <h2 className="truncate text-base font-black sm:text-lg">{post.title}</h2>
            </div>
            <button type="button" data-reader-close onClick={onClose} {...tooltip("Đóng bài viết")} className="shrink-0 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" /></button>
          </div>
          <div data-reader-toolbar className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-3 py-2 sm:px-5">
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1" aria-label="Điều chỉnh kích thước chữ">
              <button type="button" onClick={() => setZoom((current) => ZOOM_LEVELS[Math.max(0, ZOOM_LEVELS.indexOf(current as (typeof ZOOM_LEVELS)[number]) - 1)])} disabled={zoom === ZOOM_LEVELS[0]} {...tooltip("Thu nhỏ toàn bộ bài viết")} className="rounded-lg p-1.5 hover:bg-white disabled:opacity-40"><ZoomOut className="h-4 w-4" /></button>
              <span className="min-w-11 text-center text-xs font-semibold">{zoom}%</span>
              <button type="button" onClick={() => setZoom((current) => ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, ZOOM_LEVELS.indexOf(current as (typeof ZOOM_LEVELS)[number]) + 1)])} disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]} {...tooltip("Phóng to toàn bộ bài viết")} className="rounded-lg p-1.5 hover:bg-white disabled:opacity-40"><ZoomIn className="h-4 w-4" /></button>
              <button type="button" onClick={() => setZoom(100)} {...tooltip("Đặt lại kích thước bài viết 100%")} className="rounded-lg p-1.5 text-xs font-semibold hover:bg-white"><RotateCcw className="h-3.5 w-3.5" /></button>
            </div>
            <button type="button" onClick={() => setIsAutoScrolling((value) => !value)} disabled={isReducedMotion} {...tooltip(isAutoScrolling ? "Tạm dừng tự động cuộn" : "Tự động cuộn")} className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold ${isAutoScrolling ? "bg-emerald-600 text-white" : "bg-slate-100 hover:bg-emerald-50"} disabled:cursor-not-allowed disabled:opacity-50`}>{isAutoScrolling ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}<span className="hidden sm:inline">{isAutoScrolling ? "Tạm dừng" : "Tự cuộn"}</span></button>
            <label className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2 py-1.5 text-xs" {...tooltip("Tốc độ tự động cuộn")}><span className="sr-only">Tốc độ cuộn</span><select aria-label="Tốc độ tự động cuộn" value={speedIndex} onChange={(event) => setSpeedIndex(Number(event.target.value))} className="max-w-20 bg-transparent outline-none">{SPEED_LABELS.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label>
            <button type="button" onClick={() => void toggleFullscreen()} {...tooltip(isFullscreen || isCssFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình")} className="rounded-xl bg-slate-100 p-2 hover:bg-emerald-50">{isFullscreen || isCssFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
            <button type="button" onClick={() => setIsDark((value) => !value)} {...tooltip(isDark ? "Chế độ sáng" : "Chế độ tối")} className="rounded-xl bg-slate-100 p-2 hover:bg-emerald-50">{isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
            <button type="button" onClick={() => setIsFocus((value) => !value)} {...tooltip(isFocus ? "Thoát chế độ tập trung" : "Chế độ tập trung")} className={`rounded-xl p-2 ${isFocus ? "bg-emerald-600 text-white" : "bg-slate-100 hover:bg-emerald-50"}`}><Focus className="h-4 w-4" /></button>
            <button type="button" onClick={printArticle} {...tooltip("In bài viết")} className="rounded-xl bg-slate-100 p-2 hover:bg-emerald-50"><Printer className="h-4 w-4" /></button>
            {showAdminActions && onEdit && onDelete && <div className="ml-auto flex items-center gap-2" data-reader-actions>
              <button type="button" onClick={onEdit} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">Chỉnh sửa</button>
              <button type="button" onClick={onDelete} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">Xóa</button>
            </div>}
          </div>
        </header>
        <div data-reader-progress className="h-1 shrink-0 bg-slate-100"><div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${progress}%` }} /></div>
        <div ref={scrollRef} data-reader-scroll data-reader-print-root onWheel={pauseForManualScroll} onTouchStart={pauseForManualScroll} onPointerDown={(event) => { if (event.clientX >= event.currentTarget.getBoundingClientRect().right - 16) pauseForManualScroll(); }} onKeyDown={(event) => { if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) pauseForManualScroll(); }} tabIndex={0} className={`min-h-0 overflow-y-auto overscroll-contain bg-white ${showAdminActions ? "flex-1" : "max-h-[calc(86vh-140px)] flex-none"}`}>
          <div data-reader-print-header className="mx-auto w-full max-w-4xl px-4 pt-5 sm:px-8">
            <img src="/assets/images/asia-logo.png" alt="Asia F&B" />
            <div><strong>Asia Food &amp; Beverage</strong><span>BẢN TIN TRUYỀN THÔNG NỘI BỘ</span></div>
          </div>
          <article data-reader-page style={{ zoom: zoom / 100, width: `${10000 / zoom}%`, maxWidth: `${89600 / zoom}px` }} className={`mx-auto max-w-4xl ${showAdminActions ? "px-4 py-5 sm:px-8 sm:py-8" : "px-4 py-4 sm:px-6 sm:py-5"} ${isFocus ? "reader-focus" : ""}`}>
            {post.coverImage && <img data-reader-cover src={post.coverImage} alt={post.title} className={`reader-cover mb-5 ${showAdminActions ? "max-h-[420px]" : "max-h-[280px]"} w-full rounded-2xl object-cover ${isFocus ? "hidden" : ""}`} />}
            <h1 className="mb-4 text-2xl font-black leading-tight sm:text-3xl">{post.title}</h1>
            <div className={isFocus ? "hidden" : ""}>
              <RichText html={post.summary} className="reader-copy reader-summary rich-content mb-4 text-base leading-7 text-slate-600" />
              <p className="reader-date mb-6 flex items-center gap-2 text-sm text-slate-500"><Calendar className="h-4 w-4" />{post.publishDate}</p>
            </div>
            <RichText html={post.content} className="reader-copy rich-content rounded-2xl bg-emerald-50 p-4 leading-relaxed text-slate-800 sm:p-6" />
          </article>
        </div>
          </section>}
    </div>
  , document.body) : null;
}
