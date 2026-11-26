"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * Shows one picture over the page instead of opening a new tab.
 * Closes with the X button, the Esc key, or a click outside the picture.
 */
export default function ImageLightbox({ image, onClose }: { image: { src: string; name: string } | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (image) { if (!element?.open) element?.showModal(); }
    else element?.close();
  }, [image]);

  return <dialog
    ref={dialog}
    aria-label={image ? `Xem ảnh ${image.name}` : "Xem ảnh"}
    // Esc: close through the parent so its state stays in step.
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    // The picture and the caption catch their own clicks; anything else is the dark area.
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-4 backdrop:bg-slate-950/80 backdrop:backdrop-blur-sm sm:p-10"
  >
    {image && <>
      <button type="button" autoFocus onClick={onClose} aria-label="Đóng ảnh" className="fixed right-4 top-4 z-10 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-white/90 text-slate-800 shadow-lg hover:bg-white focus-visible:outline-2 focus-visible:outline-emerald-400"><X size={22} /></button>
      <div className="pointer-events-none flex h-full w-full flex-col items-center justify-center gap-3">
        {/* Local previews use browser object URLs. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt={image.name} className="pointer-events-auto max-h-[calc(100%-2.5rem)] max-w-full rounded-xl bg-white object-contain shadow-2xl" />
        <p className="pointer-events-auto max-w-full truncate rounded-full bg-slate-900/70 px-3 py-1 text-xs text-white">{image.name} · Bấm Esc hoặc ✕ để đóng</p>
      </div>
    </>}
  </dialog>;
}
