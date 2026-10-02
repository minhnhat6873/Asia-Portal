import type { Employee } from "@/types/employee";
import EmployeeList from "./EmployeeList";

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
  const displayedEmployees = employees;
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = total ? from + displayedEmployees.length - 1 : 0;
  const selectEmployee = (employee: Employee) => {
    onSelect(employee);
    onOpenProfile();
  };

  return (
    <section>
      <div className="mb-3 sm:mb-4">
        <p className="text-sm font-medium text-slate-500">
          Hiển thị <span className="font-semibold text-slate-600">{from} - {to}</span> trong <span className="font-semibold text-slate-600">{total}</span> nhân viên
        </p>
      </div>

      {displayedEmployees.length ? (
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
