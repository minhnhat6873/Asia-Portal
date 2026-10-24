"use client";

import { useEffect, useRef, useState } from "react";
import { Signature, X } from "lucide-react";

export default function EmailSignatureDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return <>
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => setIsOpen(true)}
      className="inline-flex min-h-10 items-center gap-2 rounded-lg text-xs font-semibold text-blue-600 underline decoration-blue-200 underline-offset-4 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
    >
      <Signature aria-hidden="true" size={16} />Mẫu chữ ký email
    </button>
    <dialog
      ref={dialogRef}
      aria-labelledby="email-signature-title"
      onClose={() => setIsOpen(false)}
      onClick={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}
      className="fixed inset-0 m-auto h-[92dvh] max-h-[92dvh] w-[calc(100%-1rem)] max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm sm:w-[calc(100%-3rem)]"
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
          <div>
            <h2 id="email-signature-title" className="text-lg font-bold text-emerald-800">Mẫu chữ ký email Á Châu</h2>
            <p className="mt-1 text-xs text-slate-500">Sao chép chữ ký và làm theo hướng dẫn bên dưới.</p>
          </div>
          <button type="button" aria-label="Đóng mẫu chữ ký email" onClick={() => setIsOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-600"><X aria-hidden="true" size={20} /></button>
        </header>
        {isOpen && <iframe
          src="/assets/email-signature/Chu_ky_email_AChau.html"
          title="Chữ ký email Á Châu và hướng dẫn cài đặt Outlook"
          className="min-h-0 w-full flex-1 border-0 bg-slate-50"
        />}
      </div>
    </dialog>
  </>;
}
