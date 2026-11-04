"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { Frown, Leaf, MessageSquareText, Send, User, X } from "lucide-react";
import { ApiError } from "@/services/api";
import { submitFeedback } from "@/services/feedback.service";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { FEEDBACK_LIMITS, type FeedbackSubmission } from "@/features/admin/feedback/feedback.types";
import { feedbackPlainText } from "@/features/admin/feedback/feedback.utils";

const EMAIL_PATTERN = /^(?!.*\.\.)[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?@asiafnb\.com$/i;
const INPUT_CLASS = "w-full rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2";
const inputTone = (hasError: boolean) => (hasError ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/20" : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20");

type FieldName = "title" | "content" | "name" | "email";

function Field({ id, label, required, error, hint, children }: { id: string; label: string; required?: boolean; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-slate-700">{label}{required && <span className="text-rose-500"> *</span>}</label>
        {hint}
      </div>
      {children}
      {error && <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

function Counter({ length, max }: { length: number; max: number }) {
  return <span className={`text-xs tabular-nums ${length > max ? "font-semibold text-rose-500" : "text-slate-400"}`}>{length}/{max}</span>;
}

function ThankYouPanel({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus(); }, []);
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="feedback-thanks-title" aria-describedby="feedback-thanks-description" className="relative w-full max-w-md overflow-hidden rounded-3xl bg-[#f7f8f6] px-6 pb-7 pt-8 text-center shadow-2xl sm:px-8">
      <svg aria-hidden="true" viewBox="0 0 220 140" className="pointer-events-none absolute -bottom-2 -left-2 w-36 text-emerald-100 sm:w-44">
        <path d="M0 140 C30 70 110 50 220 140" fill="none" stroke="currentColor" strokeWidth="26" />
        <path d="M0 140 C20 100 80 90 140 140" fill="none" stroke="currentColor" strokeWidth="16" opacity="0.7" />
        <path d="M30 70 C30 45 45 30 70 22 C68 45 55 62 30 70 Z M30 70 L22 92" fill="currentColor" stroke="currentColor" strokeWidth="3" />
      </svg>
      <button type="button" aria-label="Đóng" onClick={onClose} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-emerald-600"><X aria-hidden="true" className="h-5 w-5" /></button>

      <div className="relative mx-auto flex w-fit items-center justify-center">
        <Leaf aria-hidden="true" className="absolute -left-9 top-1/2 h-9 w-9 -translate-y-1/4 -scale-x-100 rotate-[-20deg] fill-[#5fae4a] text-[#3f8f32]" strokeWidth={1.2} />
        <span className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-100">
          <span className="relative h-20 w-20 overflow-hidden rounded-full shadow-md ring-[3px] ring-[#d9b23c]">
            <Image src="/assets/images/asia-logo.png" alt="Asia F&B" fill sizes="80px" className="object-cover" />
          </span>
        </span>
        <Leaf aria-hidden="true" className="absolute -right-9 top-1/2 h-9 w-9 -translate-y-1/4 rotate-[20deg] fill-[#5fae4a] text-[#3f8f32]" strokeWidth={1.2} />
      </div>

      <h2 id="feedback-thanks-title" className="relative mt-4 text-xl font-extrabold tracking-tight text-[#0b5a2a] sm:text-2xl">Cảm ơn bạn đã đóng góp ý kiến!</h2>
      <p id="feedback-thanks-description" className="relative mx-auto mt-2 text-sm leading-6 text-slate-600">Ý kiến của bạn rất quan trọng đối với chúng tôi. Chúng tôi sẽ xem xét và phản hồi trong thời gian sớm nhất.</p>

      <div className="relative mt-5 flex items-center gap-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-[#e6f2e3] px-4 py-3 text-left">
        <MessageSquareText aria-hidden="true" className="h-7 w-7 shrink-0 text-[#0b5a2a]" strokeWidth={1.8} />
        <span aria-hidden="true" className="h-8 w-px shrink-0 bg-[#0b5a2a]/40" />
        <p className="text-[13px] leading-5 text-[#0b5a2a]">Mọi đóng góp của bạn sẽ giúp chúng tôi ngày càng hoàn thiện hơn!</p>
      </div>

      <button ref={closeRef} type="button" onClick={onClose} className="relative mt-6 inline-flex min-w-40 items-center justify-center rounded-full bg-[#0b5a2a] px-8 py-2.5 text-base font-bold text-white shadow-md transition-colors hover:bg-[#084a22] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600">Đóng</button>
    </div>
  );
}

export default function FeedbackDialog() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const ids = { title: `${uid}-title`, content: `${uid}-content`, name: `${uid}-name`, email: `${uid}-email` };
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [generalError, setGeneralError] = useState("");

  // Lớp phủ thường thay vì <dialog> modal: <dialog> nằm ở "top layer" nên menu/popup
  // của TinyMCE (gắn vào <body>) sẽ bị che phía sau và không bấm được.
  useEffect(() => {
    if (!isOpen) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    titleInputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      // Menu TinyMCE đang mở thì Escape chỉ đóng menu đó.
      if (event.key === "Escape" && !document.querySelector(".tox-menu, .tox-dialog")) { setIsOpen(false); setSubmitted(false); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [isOpen]);

  const contentText = feedbackPlainText(content);
  const errors: Partial<Record<FieldName, string>> = {
    title: title.trim() ? undefined : "Vui lòng nhập tiêu đề.",
    content: contentText.length < 10 ? "Nội dung cần ít nhất 10 ký tự." : contentText.length > FEEDBACK_LIMITS.content ? `Nội dung tối đa ${FEEDBACK_LIMITS.content} ký tự.` : undefined,
    name: anonymous ? undefined : !name.trim() ? "Vui lòng nhập họ và tên." : name.trim().length < 2 || !/^[\p{L} .'-]+$/u.test(name.trim()) ? "Họ và tên không hợp lệ." : undefined,
    email: anonymous ? undefined : !email.trim() ? "Vui lòng nhập email." : EMAIL_PATTERN.test(email.trim()) ? undefined : "Email phải có dạng ten@asiafnb.com.",
  };
  const shownError = (field: FieldName) => (serverErrors[field] ?? (touched[field] ? errors[field] : undefined));
  const touch = (field: FieldName) => () => { setServerErrors((current) => ({ ...current, [field]: undefined })); setTouched((current) => ({ ...current, [field]: true })); };
  const errorProps = (field: FieldName) => ({ "aria-invalid": Boolean(shownError(field)), "aria-describedby": shownError(field) ? `${ids[field]}-error` : undefined });

  // Đúng dạng dữ liệu trang "Quản lý đóng góp ý kiến" đang dùng.
  const submission: FeedbackSubmission = {
    title: title.trim(),
    content,
    sender: anonymous ? null : { name: name.trim(), email: email.trim() },
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    setTouched({ title: true, content: true, name: true, email: true });
    setServerErrors({}); setGeneralError("");
    if (Object.values(errors).some(Boolean)) return;
    setSending(true);
    try {
      await submitFeedback({ title: submission.title, content: submission.content, isAnonymous: anonymous, ...(submission.sender ? { senderName: submission.sender.name, senderEmail: submission.sender.email } : {}) });
      setTitle(""); setContent(""); setName(""); setEmail(""); setAnonymous(false); setTouched({}); setSubmitted(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 400 && Object.keys(error.fieldErrors).length) {
        const fields = error.fieldErrors;
        setServerErrors({ title: fields.title, content: fields.content, name: fields.senderName, email: fields.senderEmail });
        if (fields.isAnonymous) setGeneralError(fields.isAnonymous);
      } else setGeneralError(error instanceof ApiError ? error.message : "Không thể kết nối tới máy chủ. Vui lòng thử lại.");
    } finally { setSending(false); }
  };

  const close = () => { setIsOpen(false); setSubmitted(false); };

  return (
    <>
      <button ref={triggerRef} type="button" aria-haspopup="dialog" onClick={() => setIsOpen(true)} className="text-left text-sm text-white/60 transition-colors hover:text-[#f5c800] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
        Đóng góp ý kiến
      </button>
      {isOpen && <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      {submitted ? <ThankYouPanel onClose={close} /> : <div role="dialog" aria-modal="true" aria-labelledby={`${uid}-heading`} aria-describedby={`${uid}-description`} className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
        <form noValidate onSubmit={handleSubmit} className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#0d5c0d] to-[#1a7a1a] px-6 pb-6 pt-5 text-white">
            <svg aria-hidden="true" viewBox="0 0 200 60" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-14 w-full text-white/10"><path d="M0 60 L0 44 C70 50 120 40 160 22 C178 14 190 8 200 4 L200 60 Z" fill="currentColor" /></svg>
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><MessageSquareText className="h-6 w-6" /></span>
                <div>
                  <h2 id={`${uid}-heading`} className="text-xl font-bold">Đóng góp ý kiến</h2>
                  <p id={`${uid}-description`} className="mt-1 text-sm leading-relaxed text-white/80">Chia sẻ lỗi bạn gặp hoặc đề xuất giúp hệ thống tốt hơn.</p>
                </div>
              </div>
              <button type="button" aria-label="Đóng" onClick={close} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/80 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-white"><X aria-hidden="true" className="h-5 w-5" /></button>
            </div>
          </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <Field id={ids.title} label="Tiêu đề" required error={shownError("title")} hint={<Counter length={title.length} max={FEEDBACK_LIMITS.title} />}>
              <input ref={titleInputRef} id={ids.title} value={title} maxLength={FEEDBACK_LIMITS.title} onChange={(event) => setTitle(event.target.value)} onBlur={touch("title")} placeholder="Ví dụ: Đề xuất cải thiện quy trình nghỉ phép" className={`${INPUT_CLASS} ${inputTone(Boolean(shownError("title")))}`} {...errorProps("title")} />
            </Field>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span id={ids.content} className="text-sm font-semibold text-slate-700">Nội dung<span className="text-rose-500"> *</span></span>
                <Counter length={contentText.length} max={FEEDBACK_LIMITS.content} />
              </div>
              <div role="group" aria-labelledby={ids.content} {...errorProps("content")} className={`overflow-hidden rounded-xl border ${shownError("content") ? "border-rose-300" : "border-slate-200"} [&_.tox-tinymce]:!rounded-xl [&_.tox-tinymce]:!border-0`}>
                <RichTextEditor toolbarPreset="full" height={320} value={content} onChange={setContent} onBlur={touch("content")} placeholder="Mô tả chi tiết ý kiến, lỗi gặp phải hoặc đề xuất của bạn..." />
              </div>
              {shownError("content") && <p id={`${ids.content}-error`} className="mt-1.5 text-xs font-medium text-rose-600">{shownError("content")}</p>}
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${anonymous ? "bg-slate-800 text-white" : "bg-emerald-50 text-emerald-700"}`}>{anonymous ? <Frown className="h-5 w-5" /> : <User className="h-5 w-5" />}</span>
                  <div>
                    <p id={`${uid}-anon-label`} className="text-sm font-semibold text-slate-800">Gửi ẩn danh</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{anonymous ? "Tên và email của bạn sẽ không được gửi đi." : "Bật để ẩn tên và email với người quản trị."}</p>
                  </div>
                </div>
                <button type="button" role="switch" aria-checked={anonymous} aria-labelledby={`${uid}-anon-label`} onClick={() => setAnonymous((value) => !value)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${anonymous ? "bg-emerald-600" : "bg-slate-300"}`}>
                  <span aria-hidden="true" className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${anonymous ? "translate-x-5" : ""}`} />
                </button>
              </div>

              {!anonymous && (
                <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  <Field id={ids.name} label="Họ và tên" required error={shownError("name")}>
                    <input id={ids.name} autoComplete="name" value={name} maxLength={FEEDBACK_LIMITS.name} onChange={(event) => setName(event.target.value)} onBlur={touch("name")} placeholder="Nguyễn Văn A" className={`${INPUT_CLASS} ${inputTone(Boolean(shownError("name")))}`} {...errorProps("name")} />
                  </Field>
                  <Field id={ids.email} label="Email" required error={shownError("email")}>
                    <input id={ids.email} type="email" autoComplete="email" value={email} maxLength={FEEDBACK_LIMITS.email} onChange={(event) => setEmail(event.target.value)} onBlur={touch("email")} placeholder="ten@asiafnb.com" className={`${INPUT_CLASS} ${inputTone(Boolean(shownError("email")))}`} {...errorProps("email")} />
                  </Field>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-xs text-slate-500">Người quản trị sẽ thấy:</span>
              <span className="flex min-w-0 items-center gap-2">
                {submission.sender ? <User aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-600" /> : <Frown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-600" />}
                <span className="truncate text-sm font-semibold text-slate-800">{submission.sender ? submission.sender.name || "Họ và tên" : "Ẩn danh"}</span>
                {submission.sender?.email && <span className="truncate text-xs text-slate-500">· {submission.sender.email}</span>}
              </span>
            </div>

          </div>

          {generalError && <p role="alert" className="px-6 pb-2 text-sm text-rose-600">{generalError}</p>}
          <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
            <button type="button" onClick={close} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Hủy</button>
            <button type="submit" disabled={sending} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0d5c0d] to-[#1a7a1a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">{sending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send aria-hidden="true" className="h-4 w-4" />}{sending ? "Đang gửi..." : "Gửi ý kiến"}</button>
          </footer>
        </form>
      </div>}
      </div>}
    </>
  );
}
