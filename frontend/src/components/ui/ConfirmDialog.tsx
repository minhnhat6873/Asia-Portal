"use client";

import { useEffect, useRef } from "react";

/** Small yes/no question in a native modal dialog (Esc or the first button keeps things as they are). */
export default function ConfirmDialog({ open, title, description, cancelLabel, confirmLabel, tone = "danger", onCancel, onConfirm }: {
  open: boolean;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    else if (!open && element?.open) element.close();
  }, [open]);

  return <dialog ref={dialog} aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description" onCancel={(event) => { event.preventDefault(); onCancel(); }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm">
    <h2 id="confirm-dialog-title" className="text-lg font-bold text-slate-900">{title}</h2>
    <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
      <button type="button" autoFocus onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{cancelLabel}</button>
      <button type="button" onClick={onConfirm} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tone === "danger" ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>{confirmLabel}</button>
    </div>
  </dialog>;
}
