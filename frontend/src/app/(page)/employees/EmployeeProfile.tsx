import Image from "next/image";
import { BriefcaseBusiness, Building2, CalendarDays, Mail, MapPin, Phone, UserRound } from "lucide-react";
import type { Employee } from "@/types/employee";
import { formatJoinDate, getEmployeeAvatar } from "./employeeUtils";

export default function EmployeeProfile({ employee }: { employee: Employee }) {
  const details = [
    { icon: UserRound, label: "Mã nhân viên", value: employee.employeeCode },
    { icon: CalendarDays, label: "Ngày gia nhập", value: formatJoinDate(employee.joinDate) },
    { icon: BriefcaseBusiness, label: "Chức vụ", value: employee.position },
    { icon: Building2, label: "Phòng ban", value: employee.department },
    { icon: MapPin, label: "Văn phòng", value: employee.location },
    { icon: Mail, label: "Email", value: employee.email },
    { icon: Phone, label: "Số điện thoại", value: employee.phone },
  ];

  return (
    <aside className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm xl:sticky xl:top-24">
      <div className="flex gap-4 border-b border-slate-100 pb-4">
        <div className="relative h-36 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          <Image src={getEmployeeAvatar(employee)} alt={`Chân dung ${employee.name}`} fill sizes="112px" className="object-cover object-top" />
        </div>
        <div className="min-w-0 pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-[#159447]"><span className="h-2 w-2 rounded-full bg-[#16b85c]" />Đang làm việc</span>
          <h2 className="mt-3 break-words text-lg font-black leading-snug text-slate-800">{employee.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{employee.position}</p>
          <p className="mt-1 text-xs text-slate-400">{employee.department}</p>
        </div>
      </div>

      <div className="flex border-b border-slate-100 text-xs font-semibold text-slate-400">
        <button type="button" className="border-b-2 border-[#159447] px-2 py-3 text-[#08723d]">Thông tin chung</button>
        <button type="button" className="px-2 py-3">Mô tả</button>
      </div>

      <dl className="space-y-2.5 py-4">
        {details.map(({ icon: Icon, label, value }) => (
          <div key={label} className="grid grid-cols-[18px_110px_minmax(0,1fr)] items-center gap-2 text-xs">
            <Icon size={14} className="text-slate-400" />
            <dt className="text-slate-400">{label}</dt>
            <dd className="truncate font-semibold text-slate-600">{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
