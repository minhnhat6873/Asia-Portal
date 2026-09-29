"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownUp,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  RotateCcw,
  Search,
} from "lucide-react";

interface EmployeeFiltersProps {
  search: string;
  department: string;
  position: string;
  departments: string[];
  positions: string[];
  newestFirst: boolean;
  onSearchChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onPositionChange: (value: string) => void;
  onToggleSort: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

function SelectFilter({
  value,
  options,
  onChange,
  label,
  icon: Icon,
  iconClass,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  label: string;
  icon: typeof Building2;
  iconClass: string;
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
    option.toLowerCase().includes(keyword.trim().toLowerCase()),
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
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{value}</span>
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
                  <span className={`min-w-0 flex-1 truncate text-sm ${active ? "font-bold text-[#064c32]" : "font-medium text-slate-700"}`}>{option}</span>
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

export default function EmployeeFilters({
  search,
  department,
  position,
  departments,
  positions,
  newestFirst,
  onSearchChange,
  onDepartmentChange,
  onPositionChange,
  onToggleSort,
  hasActiveFilters,
  onClearFilters,
}: EmployeeFiltersProps) {
  return (
    <form onSubmit={(event) => event.preventDefault()} className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 xl:grid-cols-[minmax(380px,2.6fr)_minmax(165px,0.9fr)_minmax(165px,0.9fr)_auto_auto]">
      <label className="col-span-2 flex min-h-12 min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white py-1.5 pl-3 pr-1.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors focus-within:border-[#16894a] sm:pl-4 md:col-span-3 xl:col-span-1 xl:min-h-14">
        <Search size={20} className="shrink-0 text-[#08723d]" />
        <input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Tìm kiếm theo tên, phòng ban, chức vụ..." className="min-w-0 flex-1 bg-transparent py-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 sm:py-3 sm:text-sm" />
      </label>
      <SelectFilter value={department} options={departments} onChange={onDepartmentChange} label="phòng ban" icon={Building2} iconClass="bg-green-100 text-[#08723d]" />
      <SelectFilter value={position} options={positions} onChange={onPositionChange} label="chức vụ" icon={BriefcaseBusiness} iconClass="bg-blue-50 text-blue-700" />
      <button type="button" onClick={onToggleSort} className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors hover:border-[#16894a] hover:text-[#08723d] sm:px-5 sm:py-3 sm:text-sm md:col-span-1 xl:min-h-14">
        <ArrowDownUp size={17} className="text-[#08723d]" />{newestFirst ? "Mới nhất" : "Cũ nhất"}<span className="sr-only">Đổi thứ tự ngày gia nhập</span>
      </button>
      {hasActiveFilters && (
        <button type="button" onClick={onClearFilters} className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-2.5 text-xs font-bold text-[#08723d] shadow-[0_2px_8px_rgba(15,73,45,0.06)] transition-colors hover:bg-green-100 sm:px-5 sm:py-3 sm:text-sm md:col-span-2 xl:col-span-1 xl:min-h-14">
          <RotateCcw size={17} /> Xóa tất cả bộ lọc
        </button>
      )}
    </form>
  );
}
