"use client";

import { useEffect, useRef } from "react";

export default function UnsavedChangesDialog({ open, saving, onContinue, onDiscard, onSave }: {
  open: boolean;
  saving: boolean;
  onContinue: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (open) element?.showModal();
    else element?.close();
  }, [open]);

  return <dialog ref={dialog} aria-labelledby="unsaved-title" aria-describedby="unsaved-description" onCancel={(event) => { event.preventDefault(); if (!saving) onContinue(); }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm">
    <h2 id="unsaved-title" className="text-lg font-bold text-slate-900">Bạn có thay đổi chưa lưu</h2>
    <p id="unsaved-description" className="mt-2 text-sm leading-6 text-slate-600">Bạn muốn lưu thay đổi trước khi rời trang chỉnh sửa nhân viên?</p>
    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      <button type="button" disabled={saving} autoFocus onClick={onContinue} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Tiếp tục chỉnh sửa</button>
      <button type="button" disabled={saving} onClick={onDiscard} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50">Không lưu và rời trang</button>
      <button type="button" disabled={saving} onClick={onSave} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu và rời trang"}</button>
    </div>
  </dialog>;
}
