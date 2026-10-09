import type { Employee } from "@/types/employee";
import { getEmployeeDepartmentLabel } from "@/components/ui/employee-department-options";
import { getEmployeeCode } from "../utils/employeeUtils";

interface EmployeeListProps {
  employees: Employee[];
  selectedId?: string;
  onSelect: (employee: Employee) => void;
}

export default function EmployeeList({ employees, selectedId, onSelect }: EmployeeListProps) {
  return (
    <>
      <div className="w-full min-w-0 max-w-full space-y-2 sm:hidden">
        {employees.map((employee, index) => {
          const selected = employee.id === selectedId;
          return (
            <button
              key={employee.id}
              type="button"
              onClick={() => onSelect(employee)}
              className={`box-border w-full min-w-0 max-w-full rounded-xl border bg-white p-3 text-left shadow-sm transition-colors ${selected ? "border-[#20a461] bg-green-50/70" : "border-slate-100"}`}
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="pt-0.5 text-xs font-semibold text-slate-400">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-slate-800">{employee.name}</p>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#16b85c]" />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{getEmployeeCode(employee)}</p>
                  <p className="mt-2 break-words text-xs font-medium leading-snug text-slate-600">{employee.position} · {getEmployeeDepartmentLabel(employee.department)}</p>
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-semibold text-[#159447]"><span className="h-1.5 w-1.5 rounded-full bg-[#16b85c]" />Đang làm việc</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm sm:block">
      <table className="w-full min-w-[720px] text-left">
        <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-400">
          <tr>
            <th className="w-14 px-5 py-4">#</th>
            <th className="min-w-64 px-3 py-4">Nhân viên</th>
            <th className="min-w-52 px-3 py-4">Chức vụ</th>
            <th className="min-w-48 px-3 py-4">Phòng ban</th>
            <th className="min-w-40 px-5 py-4">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee, index) => {
            const selected = employee.id === selectedId;
            return (
              <tr
                key={employee.id}
                onClick={() => onSelect(employee)}
                className={`cursor-pointer border-b border-slate-100 transition-colors last:border-0 ${
                  selected ? "bg-gradient-to-r from-green-50 to-[#fbfffc] outline outline-1 outline-[#20a461]" : "hover:bg-slate-50"
                }`}
              >
                <td className="px-5 py-3 text-sm font-semibold text-slate-500">{index + 1}</td>
                <td className="px-3 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-sm font-bold text-slate-800"><span className="truncate">{employee.name}</span><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#16b85c]" /></p>
                    <p className="mt-1 text-xs text-slate-400">{getEmployeeCode(employee)}</p>
                  </div>
                </td>
                <td className="px-3 py-3 text-sm font-medium text-slate-600">{employee.position}</td>
                <td className="px-3 py-3 text-sm text-slate-600">{getEmployeeDepartmentLabel(employee.department)}</td>
                <td className="px-5 py-3"><span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-[#159447]"><span className="h-2.5 w-2.5 rounded-full bg-[#16b85c]" />Đang làm việc</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}
