"use client";

import { useRef, useState } from "react";
import { BookOpen, Copy, Download, FolderOpen, Settings2, X } from "lucide-react";
import { NETWORK_FOLDER } from "@/config/networkFolder";
import type { ResourceItem } from "./resourceData";

type NetworkFolderCardItem = Pick<ResourceItem, "title" | "desc" | "chipTone" | "linkTone" | "linkText">;

export function NetworkFolderCard({ item }: { item: NetworkFolderCardItem }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathRef = useRef<HTMLInputElement>(null);
  const [copyMessage, setCopyMessage] = useState("");

  const copyPath = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(NETWORK_FOLDER.path);
      setCopyMessage("Đã sao chép. Nhấn Windows + R, dán đường dẫn rồi nhấn Enter.");
    } catch {
      pathRef.current?.focus();
      pathRef.current?.select();
      setCopyMessage("Đường dẫn đã được chọn. Nhấn Ctrl + C để sao chép, rồi dán vào File Explorer.");
    }
  };

  return <>
    <article className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-100 transition-all hover:border-[#bbf7d0] hover:shadow-xl">
      <div>
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${item.chipTone}`}><BookOpen aria-hidden="true" size={22} /></div>
        <h3 className="mb-1 text-base font-bold text-slate-900 group-hover:text-[#15803d]">{item.title}</h3>
        <p className="text-xs leading-relaxed text-slate-500">{item.desc}</p>
      </div>
      <div className="mt-4 space-y-2">
        <a href={NETWORK_FOLDER.uri} className={`inline-flex min-h-10 items-center gap-2 rounded-lg text-xs font-semibold outline-offset-4 focus-visible:outline-2 focus-visible:outline-emerald-600 ${item.linkTone}`}>
          <span>{item.linkText}</span><FolderOpen aria-hidden="true" size={15} />
        </a>
        <button type="button" onClick={() => { setCopyMessage(""); dialogRef.current?.showModal(); }} className="flex min-h-9 items-center gap-1.5 rounded-lg text-xs text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
          <Settings2 aria-hidden="true" size={13} />Cài đặt lần đầu / Chưa mở được?
        </button>
      </div>
    </article>

    <dialog ref={dialogRef} aria-labelledby="network-folder-setup-title" aria-describedby="network-folder-setup-description" className="fixed inset-0 m-auto max-h-[90dvh] w-[92vw] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-xl backdrop:bg-slate-900/50 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 id="network-folder-setup-title" className="text-lg font-bold">Mở thư mục tài liệu công ty</h2>
        <button type="button" autoFocus aria-label="Đóng hướng dẫn" onClick={() => dialogRef.current?.close()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X aria-hidden="true" size={20} /></button>
      </div>
      <p id="network-folder-setup-description" className="mt-2 text-sm leading-6 text-slate-600">Dành cho máy Windows kết nối mạng công ty hoặc VPN và có quyền truy cập thư mục chung.</p>
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6">
        <li>Tải file cấu hình để Windows nhận biết nút mở thư mục.
          <a href={NETWORK_FOLDER.setupUrl} download={NETWORK_FOLDER.setupFilename} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"><Download aria-hidden="true" size={16} />Tải file cấu hình Windows</a>
        </li>
        <li>Mở file <strong>{NETWORK_FOLDER.setupFilename}</strong> vừa tải. Chọn <strong>Yes / Có</strong> khi Windows hỏi xác nhận. Chỉ cần thực hiện một lần cho tài khoản Windows đang dùng.</li>
        <li>Quay lại website, bấm <strong>Mở thư mục tài liệu</strong>. Nếu Chrome hỏi mở ứng dụng, chọn <strong>Mở</strong>.</li>
      </ol>
      <div className="mt-5 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-semibold">Bạn cũng có thể mở bằng đường dẫn</h3>
        <label htmlFor="company-network-folder-path" className="mt-2 block text-xs text-slate-500">Sao chép vào File Explorer hoặc hộp thoại Windows + R:</label>
        <input ref={pathRef} id="company-network-folder-path" readOnly value={NETWORK_FOLDER.path} onFocus={(event) => event.currentTarget.select()} className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700 focus:border-emerald-600 focus:outline-none" />
        <button type="button" onClick={() => void copyPath()} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"><Copy aria-hidden="true" size={14} />Sao chép đường dẫn</button>
        {copyMessage && <p role="status" className="mt-2 text-xs leading-5 text-emerald-700">{copyMessage}</p>}
        <p className="mt-3 text-xs leading-5 text-slate-500">Nếu máy bị chặn tải hoặc cài file cấu hình, hãy liên hệ IT. Nếu thư mục chưa mở, thử sao chép đường dẫn ở trên để truy cập trực tiếp.</p>
      </div>
    </dialog>
  </>;
}
