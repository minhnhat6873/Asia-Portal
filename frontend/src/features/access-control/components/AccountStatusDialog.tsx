"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { User } from "../types";

interface Props {
  user: User;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function AccountStatusDialog({ user, saving, onClose, onConfirm }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const disable = user.status === "active";
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return createPortal(
    <dialog ref={dialog} aria-labelledby="account-status-title" aria-describedby="account-status-description"
      onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-2xl border border-slate-200 bg-white p-6 font-sans text-sm leading-relaxed text-slate-700 shadow-xl backdrop:bg-slate-950/50">
      <h2 id="account-status-title" className="text-lg font-bold text-slate-900">{disable ? "Vô hiệu hóa tài khoản?" : "Kích hoạt lại tài khoản?"}</h2>
      <div id="account-status-description" className="mt-4 space-y-3 break-words">
        <p><strong>{user.name}</strong><br />{user.email}</p>
        <p>{disable ? "Tài khoản sẽ bị chặn đăng nhập mới và mọi phiên đăng nhập hiện tại sẽ mất hiệu lực." : "Tài khoản được phép đăng nhập theo quyền đã cấp. Các phiên từng bị thu hồi vẫn mất hiệu lực."}</p>
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button autoFocus type="button" disabled={saving} onClick={onClose} className="min-h-10 rounded-xl border border-slate-300 px-4 font-semibold disabled:opacity-50">Hủy</button>
        <button type="button" disabled={saving} onClick={() => void onConfirm()} className="min-h-10 rounded-xl bg-[#1a7a1a] px-4 font-semibold text-white hover:bg-[#0d5c0d] disabled:opacity-50">{saving ? "Đang cập nhật..." : disable ? "Vô hiệu hóa" : "Kích hoạt lại"}</button>
      </div>
    </dialog>, document.body,
  );
}
