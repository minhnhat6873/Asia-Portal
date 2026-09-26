"use client";

import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface AdminSelectOption { value: string; label: string; }
interface AdminSelectProps { value: string; options: AdminSelectOption[]; onChange: (value: string) => void; placeholder?: string; searchPlaceholder?: string; className?: string; disabled?: boolean; searchable?: boolean; showSelectionCheck?: boolean; }

/** Bộ lọc có tìm kiếm vốn chỉ dùng ở danh sách nhân sự. */
export function AdminSelect({ value, options, onChange, placeholder = 'Chọn dữ liệu', searchPlaceholder = 'Tìm kiếm...', className = '', disabled = false, searchable = true, showSelectionCheck = true }: AdminSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  const visibleOptions = useMemo(() => options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase())), [options, query]);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (nextValue: string) => { onChange(nextValue); setQuery(''); setIsOpen(false); };

  return <div ref={rootRef} className={`relative ${className}`}>
    <button type="button" disabled={disabled} onClick={() => !disabled && setIsOpen((open) => !open)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-2xs transition-all hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60">
      <span className="truncate">{selected?.label ?? placeholder}</span><ChevronDown className={`h-4 w-4 shrink-0 text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
      {searchable && <div className="relative mb-2"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-emerald-400" /></div>}
      <div className="max-h-56 space-y-1 overflow-y-auto">{visibleOptions.length === 0 ? <p className="px-3 py-4 text-center text-xs text-slate-500">Không có kết quả phù hợp.</p> : visibleOptions.map((option) => { const isSelected = option.value === value; return <button key={option.value} type="button" onClick={() => choose(option.value)} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${isSelected ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-50'}`}><span className="truncate">{option.label}</span>{showSelectionCheck && isSelected && <Check className="h-4 w-4 shrink-0 rounded-full bg-emerald-600 p-0.5 text-white" />}</button>; })}</div>
    </div>}
  </div>;
}
