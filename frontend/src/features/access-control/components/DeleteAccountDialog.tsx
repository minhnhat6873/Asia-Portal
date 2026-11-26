"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import type { User } from "../types";

interface Props {
  user: User;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  className?: string;
}

export function DeleteAccountDialog({ user, saving, onClose, onConfirm, className = "" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);

  return createPortal(
    <dialog ref={ref} aria-labelledby="delete-account-title" aria-describedby="delete-account-description" onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }} className={`m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border-0 bg-white p-6 text-base text-slate-800 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm ${className}`}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Trash2 className="h-6 w-6" /></div>
      <h2 id="delete-account-title" className="text-xl font-bold">Chuyển tài khoản vào thùng rác?</h2>
      <div id="delete-account-description" className="mt-3 space-y-2 break-words leading-relaxed text-slate-600">
        <p>Tài khoản <strong>{user.name}</strong> ({user.email}) sẽ được chuyển vào thùng rác tài khoản.</p>
        <p>Người dùng bị đăng xuất khỏi mọi thiết bị và không đăng nhập được. Bạn có thể khôi phục trong thùng rác.</p>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" disabled={saving} onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 px-5 py-3 font-semibold disabled:opacity-50">Hủy</button>
        <button type="button" disabled={saving} onClick={() => void onConfirm()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 font-bold text-white hover:bg-rose-700 disabled:opacity-50"><Trash2 className="h-4 w-4" />{saving ? "Đang chuyển..." : "Chuyển vào thùng rác"}</button>
      </div>
    </dialog>, document.body,
  );
}
