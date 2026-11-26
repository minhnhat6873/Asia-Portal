"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";

const TONES = {
  rose: { icon: "bg-rose-50 text-rose-600", button: "bg-rose-600 hover:bg-rose-700" },
  amber: { icon: "bg-amber-50 text-amber-600", button: "bg-amber-600 hover:bg-amber-700" },
  emerald: { icon: "bg-emerald-50 text-emerald-700", button: "bg-emerald-700 hover:bg-emerald-800" },
};

// Confirmation dialog shared by lock, unlock, delete, restore and permanent delete.
export function AccountActionDialog({ title, Icon, tone, confirmLabel, busyLabel, saving, onClose, onConfirm, children, className = "" }: {
  title: string; Icon: LucideIcon; tone: keyof typeof TONES; confirmLabel: string; busyLabel: string;
  saving: boolean; onClose: () => void; onConfirm: () => void; children: ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);

  return createPortal(
    <dialog ref={ref} aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }} className={`m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border-0 bg-white p-6 text-base text-slate-800 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm ${className}`}>
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${TONES[tone].icon}`}><Icon className="h-6 w-6" /></div>
      <h2 id={`${id}-title`} className="text-xl font-bold">{title}</h2>
      <div id={`${id}-body`} className="mt-3 space-y-3 break-words leading-relaxed text-slate-600">{children}</div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" disabled={saving} onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 px-5 py-3 font-semibold disabled:opacity-50">Hủy</button>
        <button type="button" disabled={saving} onClick={onConfirm} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold text-white disabled:opacity-50 ${TONES[tone].button}`}><Icon className="h-4 w-4" />{saving ? busyLabel : confirmLabel}</button>
      </div>
    </dialog>, document.body,
  );
}
