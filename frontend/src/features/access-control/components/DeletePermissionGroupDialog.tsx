"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import type { Role } from "../types";

interface Props {
  role: Role;
  assignedCount: number;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeletePermissionGroupDialog({ role, assignedCount, saving, onClose, onConfirm }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return createPortal(
    <dialog ref={ref} aria-labelledby="delete-group-title" aria-describedby="delete-group-description" onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border-0 bg-white p-6 text-base text-slate-800 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Trash2 aria-hidden="true" className="h-7 w-7" /></div>
      <h2 id="delete-group-title" className="text-2xl font-bold">Xóa nhóm quyền?</h2>
      <p id="delete-group-description" className="mt-3 break-words leading-relaxed text-slate-600">Nhóm <strong>{role.name}</strong> sẽ bị xóa vĩnh viễn. {assignedCount > 0 ? `${assignedCount} tài khoản đang được gán sẽ mất quyền từ nhóm này. ` : ""}Tài khoản và các nhóm quyền khác vẫn được giữ.</p>
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" disabled={saving} onClick={onClose} className="min-h-12 rounded-xl border border-slate-300 px-5 py-3 font-semibold disabled:opacity-50">Hủy</button>
        <button type="button" disabled={saving} onClick={() => { if (!saving) void onConfirm(); }} className="min-h-12 rounded-xl bg-rose-600 px-5 py-3 font-bold text-white hover:bg-rose-700 disabled:opacity-50">{saving ? "Đang xóa..." : "Xác nhận xóa nhóm quyền"}</button>
      </div>
    </dialog>, document.body,
  );
}
