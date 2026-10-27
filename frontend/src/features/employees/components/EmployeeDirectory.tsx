import type { ReactNode } from "react";
import type { Employee } from "@/types/employee";
import EmployeeList from "./EmployeeList";
import EmployeeProfile from "./EmployeeProfile";

interface EmployeeDirectoryProps {
  employees: Employee[];
  selectedId?: string;
  pagination?: ReactNode;
  viewMode: "list" | "grid";
  onSelect: (employee: Employee) => void;
  onOpenProfile: () => void;
}

export default function EmployeeDirectory({ employees, selectedId, pagination, viewMode, onSelect, onOpenProfile }: EmployeeDirectoryProps) {
  const displayedEmployees = employees;
  const selectEmployee = (employee: Employee) => {
    onSelect(employee);
    onOpenProfile();
  };

  return (
    <section id="employee-directory-results" className="w-full min-w-0 max-w-full scroll-mt-6">
      <div className={viewMode === "list" ? "overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm" : "space-y-4"}>
        {displayedEmployees.length ? viewMode === "grid" ? (
          <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayedEmployees.map((employee) => <EmployeeProfile key={employee.id} employee={employee} className="min-w-0" imageSizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />)}
          </div>
        ) : <EmployeeList employees={displayedEmployees} selectedId={selectedId} onSelect={selectEmployee} /> : <EmptyState />}
        {pagination ? <div className="border-t border-slate-100">{pagination}</div> : null}
      </div>
    </section>
  );
}

function EmptyState() {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center text-sm text-slate-400">Không tìm thấy nhân viên phù hợp với bộ lọc.</div>;
}
