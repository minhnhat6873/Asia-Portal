"use client";

import { useRef, type ReactNode } from "react";
import Image from "next/image";
import { ArrowUpRight, X } from "lucide-react";

const systems = [
  { name: "GWS", description: "Google Workspace", href: "https://workspace.google.com/dashboard", logo: "/assets/images/google-logo.png" },
  { name: "MatBao", description: "Email Mắt Bão", href: "https://pro218.emailserver.vn", logo: "/assets/images/matbao-logo.png" },
];

export default function EmailSystemPicker({ children, className }: { children: ReactNode; className: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" className={`${className} text-left`} aria-haspopup="dialog" onClick={() => dialogRef.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="email-system-title"
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-slate-100 bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-slate-950/30 backdrop:backdrop-blur-sm"
        onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="email-system-title" className="text-lg font-bold">Chọn hệ thống Email</h2>
          <button type="button" aria-label="Đóng" onClick={() => dialogRef.current?.close()} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="space-y-2">
          {systems.map((system) => (
            <a key={system.name} href={system.href} target="_blank" rel="noopener noreferrer" onClick={() => dialogRef.current?.close()} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50 focus-visible:outline-emerald-600">
              <Image src={system.logo} alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />
              <span className="flex-1"><span className="block text-sm font-bold">{system.name}</span><span className="block text-xs text-slate-500">{system.description}</span></span>
              <ArrowUpRight size={16} className="text-slate-400" aria-hidden="true" />
              <span className="sr-only">Mở trong tab mới</span>
            </a>
          ))}
        </div>
      </dialog>
    </>
  );
}
