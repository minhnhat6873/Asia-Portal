"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleX, Search } from "lucide-react";
import { lookupEmployeesForAccount, type EmployeeLookupResult } from "@/services/access-control.service";

// Search the employee directory and pick a record; the form then copies its name, email
// and phone, so the account's email matches the record exactly (that is the link).
export function EmployeeLinkPicker({ disabled, onPick }: { disabled: boolean; onPick: (employee: EmployeeLookupResult) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EmployeeLookupResult[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setState("loading");
      lookupEmployeesForAccount(trimmed, controller.signal)
        .then((items) => { setResults(items); setState("done"); })
        .catch(() => { if (!controller.signal.aborted) setState("error"); });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [trimmed]);

  const open = trimmed.length >= 2 && state !== "idle";
  return <div className="relative sm:col-span-2">
    <label htmlFor={`${listId}-input`} className="block text-sm font-semibold">Chọn nhân viên trong quản lý nhân sự <span className="font-normal text-slate-500">(không bắt buộc)</span></label>
    <div className="group mt-1.5 flex h-14 min-w-0 items-center gap-3 rounded-xl border border-(--color-slate-200) bg-white px-4 focus-within:border-emerald-600">
      <Search className="h-6 w-6 shrink-0 text-slate-400 transition-colors group-focus-within:text-emerald-700" aria-hidden="true" />
      <input ref={inputRef} id={`${listId}-input`} type="text" role="combobox" aria-autocomplete="list" disabled={disabled} value={query} autoComplete="off" spellCheck={false}
        placeholder="Gõ tên, mã nhân viên hoặc email…" aria-controls={listId} aria-expanded={open}
        onChange={(event) => { setQuery(event.target.value); if (event.target.value.trim().length < 2) { setResults([]); setState("idle"); } }}
        className="h-full min-w-0 flex-1 rounded-xl border-0 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400 disabled:bg-slate-50" />
      {query.length > 0 && <button type="button" disabled={disabled} aria-label="Xóa nội dung tìm nhân viên" onClick={() => { setQuery(""); setResults([]); setState("idle"); inputRef.current?.focus(); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-emerald-600"><CircleX aria-hidden="true" className="h-5 w-5 fill-slate-400 text-white" /></button>}
    </div>
    {open && <div id={listId} role="listbox" aria-label="Kết quả tìm nhân viên" className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
      {state === "loading" && <p className="p-3 text-sm text-slate-500">Đang tìm…</p>}
      {state === "error" && <p className="p-3 text-sm text-rose-600">Không tìm được nhân viên. Vui lòng thử lại.</p>}
      {state === "done" && !results.length && <p className="p-3 text-sm text-slate-500">Không có nhân viên phù hợp.</p>}
      {state === "done" && results.map((employee) => {
        const taken = Boolean(employee.account);
        return <button key={employee.id} type="button" role="option" aria-selected={false} disabled={taken}
          onClick={() => { onPick(employee); setQuery(""); setResults([]); setState("idle"); }}
          className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent">
          <span className="min-w-0">
            <span className="block font-semibold text-slate-900">{employee.name} <span className="font-mono text-xs font-normal text-emerald-700">{employee.employeeCode}</span></span>
            <span className="block truncate text-xs text-slate-500">{[employee.position, employee.department].filter(Boolean).join(" · ")}</span>
            <span className="block truncate text-xs text-slate-500">{employee.email}</span>
          </span>
          {/* An account in the trash still holds the email, so the employee cannot get a new one. */}
          {taken && (employee.account?.inTrash
            ? <span className="shrink-0 rounded-full bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-600">Tài khoản trong thùng rác</span>
            : <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Đã có tài khoản</span>)}
        </button>;
      })}
    </div>}
  </div>;
}
