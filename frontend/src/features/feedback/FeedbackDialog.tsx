"use client";

import { useEffect, useRef, useState } from "react";
import { Bug, Lightbulb, MessageSquareText, X } from "lucide-react";

export default function FeedbackDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<"bug" | "feature">("bug");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");

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

  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={() => setIsOpen(true)} className="text-left text-sm text-white/60 transition-colors hover:text-[#f5c800] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
        Đóng góp ý kiến
      </button>
      <dialog ref={dialogRef} aria-labelledby="feedback-title" aria-describedby="feedback-description" onClose={() => setIsOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm">
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><MessageSquareText aria-hidden="true" size={21} /></div>
              <div>
                <h2 id="feedback-title" className="text-lg font-bold text-slate-900">Đóng góp ý kiến</h2>
                <p id="feedback-description" className="mt-1 text-sm leading-relaxed text-slate-500">Chia sẻ lỗi bạn gặp hoặc đề xuất chức năng giúp website tốt hơn.</p>
              </div>
            </div>
            <button type="button" aria-label="Đóng" onClick={() => setIsOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-600"><X aria-hidden="true" size={19} /></button>
          </div>
          <form className="mt-6 space-y-4" onSubmit={(event) => event.preventDefault()}>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-700">Loại ý kiến</legend>
              <div className="grid grid-cols-2 gap-2">
                {([{ value: "bug", label: "Báo lỗi website", icon: Bug }, { value: "feature", label: "Đề xuất chức năng", icon: Lightbulb }] as const).map(({ value, label, icon: Icon }) => (
                  <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition ${category === value ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    <input type="radio" name="category" value={value} checked={category === value} onChange={() => setCategory(value)} className="accent-emerald-600" />
                    <Icon aria-hidden="true" size={16} className="shrink-0" /><span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="feedback-message" className="mb-2 block text-sm font-semibold text-slate-700">Nội dung ý kiến <span className="text-rose-500">*</span></label>
              <textarea id="feedback-message" required maxLength={2000} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={category === "bug" ? "Mô tả lỗi và các bước để gặp lỗi..." : "Mô tả chức năng bạn muốn đề xuất..."} className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
              <p className="mt-1 text-right text-xs text-slate-400">{message.length}/2000</p>
            </div>
            <div>
              <label htmlFor="feedback-contact" className="mb-2 block text-sm font-semibold text-slate-700">Email liên hệ <span className="font-normal text-slate-400">(không bắt buộc)</span></label>
              <input id="feedback-contact" type="email" maxLength={150} value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Email để liên hệ lại với bạn" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
            </div>
            <p className="text-xs text-slate-500">Chức năng gửi ý kiến chưa được kết nối.</p>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Đóng</button>
              <button type="submit" disabled className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Gửi ý kiến</button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
