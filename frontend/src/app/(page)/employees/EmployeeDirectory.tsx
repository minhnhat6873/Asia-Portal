"use client";

import { useState } from "react";
import Image from "next/image";
import { Building2, ChevronRight, LayoutGrid, List, MapPin } from "lucide-react";
import type { Employee } from "@/types/employee";
import EmployeeList from "./EmployeeList";
import { getEmployeeAvatar } from "./employeeUtils";

interface EmployeeDirectoryProps {
  employees: Employee[];
  selectedId?: string;
  total: number;
  page: number;
  limit: number;
  onSelect: (employee: Employee) => void;
  onOpenProfile: () => void;
}

export default function EmployeeDirectory({ employees, selectedId, total, page, limit, onSelect, onOpenProfile }: EmployeeDirectoryProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const displayedEmployees = employees;
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = total ? from + displayedEmployees.length - 1 : 0;
  const selectEmployee = (employee: Employee) => {
    onSelect(employee);
    onOpenProfile();
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-4 sm:mb-4">
        <p className="text-sm font-medium text-slate-500">
          Hiển thị <span className="font-semibold text-slate-600">{from} - {to}</span> trong <span className="font-semibold text-slate-600">{total}</span> nhân viên
        </p>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setViewMode("grid")} aria-label="Hiển thị dạng lưới" className={`rounded-xl p-3 shadow-sm transition-colors ${viewMode === "grid" ? "bg-[#159447] text-white" : "border border-slate-200 bg-white text-slate-500"}`}><LayoutGrid size={20} /></button>
          <button type="button" onClick={() => setViewMode("list")} aria-label="Hiển thị dạng danh sách" className={`rounded-xl p-3 shadow-sm transition-colors ${viewMode === "list" ? "bg-[#159447] text-white" : "border border-slate-200 bg-white text-slate-500"}`}><List size={20} /></button>
        </div>
      </div>

      {viewMode === "grid" ? (
        displayedEmployees.length ? (
          <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2 xl:grid-cols-3">
            {displayedEmployees.map((employee) => <EmployeeCard key={employee.id} employee={employee} selected={selectedId === employee.id} onSelect={selectEmployee} />)}
          </div>
        ) : (
          <EmptyState />
        )
      ) : displayedEmployees.length ? (
        <EmployeeList employees={displayedEmployees} selectedId={selectedId} onSelect={selectEmployee} />
      ) : (
        <EmptyState />
      )}
    </section>
  );
}

function EmptyState() {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center text-sm text-slate-400">Không tìm thấy nhân viên phù hợp với bộ lọc.</div>;
}

function EmployeeCard({ employee, selected, onSelect }: { employee: Employee; selected: boolean; onSelect: (employee: Employee) => void }) {
  return (
    <button type="button" onClick={() => onSelect(employee)} className={`flex min-h-28 w-full items-center gap-3 rounded-xl border bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:min-h-36 ${selected ? "border-[#16934b] ring-1 ring-[#16934b]" : "border-slate-100"}`}>
      <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-25 sm:w-20">
        <Image src={getEmployeeAvatar(employee)} alt={`Chân dung ${employee.name}`} fill sizes="80px" className="object-cover object-top" />
      </div>
      <span className="min-w-0 flex-1 py-0.5 sm:pt-1">
        <span className="block truncate text-sm font-bold text-slate-800">{employee.name}</span>
        <span className="mt-1 block text-xs leading-tight text-slate-500 sm:min-h-8">{employee.position}</span>
        <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500 sm:mt-2"><Building2 size={12} />{employee.department}</span>
        <span className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500"><MapPin size={12} />{employee.location}</span>
        <span className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-[#159447] sm:mt-2"><span className="h-2 w-2 rounded-full bg-[#16b85c]" />Đang làm việc</span>
      </span>
      <ChevronRight size={19} className="shrink-0 text-[#0d5c0d] xl:hidden" />
    </button>
  );
}
