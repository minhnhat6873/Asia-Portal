"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Search } from "lucide-react";
import { normalizeSearchText } from "@/utils/normalizeSearchText";

export default function EmployeeSelectFilter({
  value,
  options,
  onChange,
  label,
  icon: Icon,
  iconClass,
  getOptionLabel = (option) => option,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  label: string;
  icon: typeof Building2;
  iconClass: string;
  getOptionLabel?: (option: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeWhenClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeWhenClickOutside);
    return () => document.removeEventListener("mousedown", closeWhenClickOutside);
  }, [open]);

  const visibleOptions = options.filter((option) =>
    normalizeSearchText(getOptionLabel(option)).includes(normalizeSearchText(keyword.trim())),
  );

  return (
    <div ref={dropdownRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={`flex min-h-14 w-full items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 text-left sm:px-4 sm:py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors ${
          open ? "border-[#29a96a] ring-1 ring-[#29a96a]" : "border-slate-200 hover:border-[#29a96a]"
        }`}
      >
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconClass}`}><Icon size={17} /></span>
        <span className="min-w-0 flex-1 break-words text-sm font-medium leading-snug text-slate-700">{getOptionLabel(value)}</span>
        <ChevronDown size={18} className={`shrink-0 text-[#0b4937] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[min(25rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2.5 shadow-[0_18px_42px_rgba(15,54,39,0.18)]">
          <label className="mb-2 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-[#29a96a] focus-within:bg-white">
            <Search size={18} className="text-slate-600" />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder={`Tìm kiếm ${label.toLowerCase()}...`} className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
          </label>
          <div className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
            {visibleOptions.map((option) => {
              const active = option === value;
              return (
                <button
                  type="button"
                  key={option}
                  onClick={() => {
                    onChange(option);
                    setKeyword("");
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${active ? "bg-gradient-to-r from-green-50 to-[#f5fbf6]" : "hover:bg-slate-50"}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}><Icon size={19} /></span>
                  <span className={`min-w-0 flex-1 break-words text-sm leading-snug ${active ? "font-bold text-[#064c32]" : "font-medium text-slate-700"}`}>{getOptionLabel(option)}</span>
                  {active && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#16934b] text-white"><Check size={16} strokeWidth={3} /></span>}
                </button>
              );
            })}
            {!visibleOptions.length && <p className="px-3 py-6 text-center text-sm text-slate-400">Không tìm thấy lựa chọn phù hợp.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

