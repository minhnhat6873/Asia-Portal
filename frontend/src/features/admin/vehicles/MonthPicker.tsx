"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button, Dialog, DialogTrigger, Popover } from "react-aria-components";

type Props = { value: string; onChange: (value: string) => void; label: string; allowClear?: boolean };

function currentMonth() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).format(new Date());
}

export default function MonthPicker({ value, onChange, label, allowClear = false }: Props) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number((value || currentMonth()).slice(0, 4)));
  const choose = (month: string) => { onChange(month); setOpen(false); };

  return <DialogTrigger isOpen={open} onOpenChange={(next) => { if (next) setYear(Number((value || currentMonth()).slice(0, 4))); setOpen(next); }}>
    <Button aria-label={label} className="inline-flex h-11 min-w-36 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-emerald-500">
      <span>{value ? `${value.slice(5, 7)} / ${value.slice(0, 4)}` : "-- / ----"}</span><CalendarDays aria-hidden="true" size={17} />
    </Button>
    <Popover placement="bottom end" offset={8} className="z-[90] w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-xl">
      <Dialog aria-label={label} className="outline-none">
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
          <button type="button" aria-label="Năm trước" disabled={year <= 1} onClick={() => setYear(year - 1)} className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40"><ChevronLeft size={20} /></button>
          <span className="text-lg font-bold text-slate-900" aria-live="polite">{year}</span>
          <button type="button" aria-label="Năm sau" disabled={year >= 9999} onClick={() => setYear(year + 1)} className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40"><ChevronRight size={20} /></button>
        </div>
        <div className="grid grid-cols-4 gap-2 p-3">{Array.from({ length: 12 }, (_, index) => {
          const number = String(index + 1).padStart(2, "0");
          const month = `${String(year).padStart(4, "0")}-${number}`;
          return <button key={number} type="button" aria-label={`Tháng ${number} năm ${year}`} aria-pressed={value === month} onClick={() => choose(month)} className={`h-11 rounded-lg border text-sm font-semibold transition ${value === month ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-200 text-slate-800 hover:bg-emerald-50"}`}>{number}</button>;
        })}</div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm font-semibold">
          <button type="button" onClick={() => choose(currentMonth())} className="text-emerald-700 hover:text-emerald-900">Tháng này</button>
          {allowClear && <button type="button" onClick={() => choose("")} className="text-slate-600 hover:text-slate-900">Xóa</button>}
        </div>
      </Dialog>
    </Popover>
  </DialogTrigger>;
}
