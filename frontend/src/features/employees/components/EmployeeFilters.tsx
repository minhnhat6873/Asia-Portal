"use client";

import {
  ArrowDownUp,
  BriefcaseBusiness,
  Building2,
  RotateCcw,
  Search,
} from "lucide-react";
import { getEmployeeDepartmentLabel } from "@/components/ui/employee-department-options";
import { getEmployeeRankLabel } from "@/components/ui/employee-rank-options";
import EmployeeSelectFilter from "@/components/ui/EmployeeSelectFilter";

interface EmployeeFiltersProps {
  search: string;
  department: string;
  rank: string;
  departments: string[];
  ranks: string[];
  newestFirst: boolean;
  onSearchChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onRankChange: (value: string) => void;
  onToggleSort: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export default function EmployeeFilters({
  search,
  department,
  rank,
  departments,
  ranks,
  newestFirst,
  onSearchChange,
  onDepartmentChange,
  onRankChange,
  onToggleSort,
  hasActiveFilters,
  onClearFilters,
}: EmployeeFiltersProps) {
  return (
    <form onSubmit={(event) => event.preventDefault()} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-[minmax(380px,2.6fr)_minmax(165px,0.9fr)_minmax(165px,0.9fr)_auto_auto]">
      <label className="col-span-1 flex min-h-12 min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white py-1.5 pl-3 pr-1.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors focus-within:border-[#16894a] sm:col-span-2 sm:pl-4 md:col-span-3 xl:col-span-1 xl:min-h-14">
        <Search size={20} className="shrink-0 text-[#08723d]" />
        <input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Tìm theo mã nhân viên hoặc họ tên..." className="min-w-0 flex-1 bg-transparent py-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 sm:py-3 sm:text-sm" />
      </label>
      <EmployeeSelectFilter value={department} options={departments} onChange={onDepartmentChange} label="phòng ban" icon={Building2} iconClass="bg-green-100 text-[#08723d]" getOptionLabel={(option) => option.startsWith("Tất cả") ? option : getEmployeeDepartmentLabel(option)} />
      <EmployeeSelectFilter value={rank} options={ranks} onChange={onRankChange} label="cấp bậc" icon={BriefcaseBusiness} iconClass="bg-blue-50 text-blue-700" getOptionLabel={(option) => option.startsWith("Tất cả") ? option : getEmployeeRankLabel(option)} />
      <button type="button" onClick={onToggleSort} className="col-span-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors hover:border-[#16894a] hover:text-[#08723d] sm:col-span-2 sm:px-5 sm:py-3 sm:text-sm md:col-span-1 xl:min-h-14">
        <ArrowDownUp size={17} className="text-[#08723d]" />{newestFirst ? "Mới nhất" : "Cũ nhất"}<span className="sr-only">Đổi thứ tự ngày gia nhập</span>
      </button>
      {hasActiveFilters && (
        <button type="button" onClick={onClearFilters} className="col-span-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-2.5 text-xs font-bold text-[#08723d] shadow-[0_2px_8px_rgba(15,73,45,0.06)] transition-colors hover:bg-green-100 sm:col-span-2 sm:px-5 sm:py-3 sm:text-sm md:col-span-2 xl:col-span-1 xl:min-h-14">
          <RotateCcw size={17} /> Xóa tất cả bộ lọc
        </button>
      )}
    </form>
  );
}
