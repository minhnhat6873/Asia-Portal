import Image from "next/image";
import type { Employee } from "@/types/employee";
import { getEmployeeAvatar, getEmployeeCode } from "./employeeUtils";

interface EmployeeListProps {
  employees: Employee[];
  selectedId?: string;
  onSelect: (employee: Employee) => void;
}

export default function EmployeeList({ employees, selectedId, onSelect }: EmployeeListProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
      <table className="min-w-[720px] w-full text-left">
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
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      <Image src={getEmployeeAvatar(employee)} alt={`Chân dung ${employee.name}`} fill sizes="56px" className="object-cover object-top" />
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-bold text-slate-800"><span className="truncate">{employee.name}</span><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#16b85c]" /></p>
                      <p className="mt-1 text-xs text-slate-400">{getEmployeeCode(employee)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-sm font-medium text-slate-600">{employee.position}</td>
                <td className="px-3 py-3 text-sm text-slate-600">{employee.department}</td>
                <td className="px-5 py-3"><span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-[#159447]"><span className="h-2.5 w-2.5 rounded-full bg-[#16b85c]" />Đang làm việc</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
