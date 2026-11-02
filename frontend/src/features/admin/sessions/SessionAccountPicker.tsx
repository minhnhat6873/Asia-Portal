"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, UserRound } from "lucide-react";
import type { ApiAccount } from "@/services/access-control.service";
import type { AdminUser } from "@/lib/adminSession";

export default function SessionAccountPicker({ account, accounts, value, onChange }: {
  account: AdminUser; accounts: ApiAccount[]; value: string; onChange: (id: string) => void;
}) {
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const options = [
    { id: account.id, label: `Tài khoản của tôi - ${account.email}` },
    ...accounts.filter((item) => item.id !== account.id && item.role !== "user").map((item) => ({
      id: item.id, label: `${item.name} - ${item.email}${item.status !== "active" ? " (không hoạt động)" : ""}`,
    })),
  ];
  const selectedIndex = Math.max(0, options.findIndex((option) => option.id === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  useEffect(() => {
    if (open) container.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[focusedIndex]?.focus();
  }, [open, focusedIndex]);

  const closeAndFocus = () => { setOpen(false); trigger.current?.focus(); };
  const handleKeys = (event: KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeAndFocus(); }
    else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      setFocusedIndex((current) => event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
        : (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    }
  };

  return <div ref={container} className="relative w-full max-w-2xl" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <label id={`${id}-label`} htmlFor={`${id}-trigger`} className="mb-2.5 block text-base font-bold text-slate-800">Xem phiên của tài khoản</label>
    <button ref={trigger} id={`${id}-trigger`} type="button" aria-haspopup="listbox" aria-expanded={open}
      aria-controls={`${id}-listbox`} aria-labelledby={`${id}-label ${id}-value`}
      onClick={() => { setFocusedIndex(selectedIndex); setOpen((current) => !current); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault(); setFocusedIndex(selectedIndex); setOpen(true);
        }
      }}
      className={`flex min-h-14 w-full items-center gap-3 rounded-xl border bg-gradient-to-r from-white to-emerald-50/40 px-4 py-3 text-left text-base text-slate-800 shadow-sm outline-none transition-colors hover:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-200 ${open ? "border-emerald-600 ring-1 ring-emerald-600" : "border-emerald-500"}`}>
      <UserRound className="h-5 w-5 shrink-0 text-slate-600" />
      <span id={`${id}-value`} title={selected.label} className="min-w-0 flex-1 truncate font-medium">{selected.label}</span>
      <ChevronDown className={`h-5 w-5 shrink-0 text-slate-600 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div id={`${id}-listbox`} role="listbox" aria-labelledby={`${id}-label`} onKeyDown={handleKeys}
      className="absolute inset-x-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
      {options.map((option, index) => {
        const active = option.id === value;
        return <div key={option.id} className="border-b border-slate-100 py-1 first:pt-0 last:border-0 last:pb-0">
          <button type="button" role="option" aria-selected={active} tabIndex={focusedIndex === index ? 0 : -1}
            onClick={() => { onChange(option.id); closeAndFocus(); }}
            className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${active ? "bg-emerald-50 font-bold text-emerald-800" : "font-medium text-slate-700 hover:bg-slate-50"}`}>
            <UserRound className={`h-5 w-5 shrink-0 ${active ? "text-emerald-700" : "text-slate-500"}`} />
            <span title={option.label} className="min-w-0 flex-1 truncate">{option.label}</span>
            {active && <Check className="h-5 w-5 shrink-0 text-emerald-700" strokeWidth={2.5} />}
          </button>
        </div>;
      })}
    </div>}
  </div>;
}
