import type { ReactNode } from "react";
import type { Employee } from "@/types/employee";
import EmployeeList from "./EmployeeList";

interface EmployeeDirectoryProps {
  employees: Employee[];
  selectedId?: string;
  total: number;
  page: number;
  limit: number;
  pagination?: ReactNode;
  onSelect: (employee: Employee) => void;
  onOpenProfile: () => void;
}

export default function EmployeeDirectory({ employees, selectedId, total, page, limit, pagination, onSelect, onOpenProfile }: EmployeeDirectoryProps) {
  const displayedEmployees = employees;
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = total ? from + displayedEmployees.length - 1 : 0;
  const selectEmployee = (employee: Employee) => {
    onSelect(employee);
    onOpenProfile();
  };

  return (
    <section id="employee-directory-results" className="w-full min-w-0 max-w-full scroll-mt-6">
      <div className="mb-3 sm:mb-4">
        <p className="text-sm font-medium text-slate-500">
          Hiển thị <span className="font-semibold text-slate-600">{from} - {to}</span> trong <span className="font-semibold text-slate-600">{total}</span> nhân viên
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        {displayedEmployees.length ? <EmployeeList employees={displayedEmployees} selectedId={selectedId} onSelect={selectEmployee} /> : <EmptyState />}
        {pagination ? <div className="border-t border-slate-100">{pagination}</div> : null}
      </div>
    </section>
  );
}

function EmptyState() {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center text-sm text-slate-400">Không tìm thấy nhân viên phù hợp với bộ lọc.</div>;
}
