"use client";

import Image from "next/image";
import { BriefcaseBusiness, Building2, CalendarDays, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { useState } from "react";
import type { Employee } from "@/types/employee";
import { formatJoinDate, getEmployeeAvatar } from "../utils/employeeUtils";

export default function EmployeeProfile({ employee }: { employee: Employee }) {
  const [activeTab, setActiveTab] = useState<"general" | "description">("general");
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
    <aside className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm xl:sticky xl:top-24">
      <div className="relative aspect-[4/3] w-full bg-slate-100">
        <Image src={getEmployeeAvatar(employee)} alt={`Chân dung ${employee.name}`} fill sizes="360px" className="object-cover object-top" />
      </div>
      <div className="p-4">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="break-words text-lg font-black leading-snug text-slate-800">{employee.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{employee.position}</p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-[#159447]"><span className="h-2 w-2 rounded-full bg-[#16b85c]" />Đang làm việc</span>
        </div>

        <div className="flex border-b border-slate-100 text-xs font-semibold text-slate-400">
          <button type="button" onClick={() => setActiveTab("general")} className={`px-2 py-3 ${activeTab === "general" ? "border-b-2 border-[#159447] text-[#08723d]" : "text-slate-400 hover:text-slate-600"}`}>Thông tin chung</button>
          <button type="button" onClick={() => setActiveTab("description")} className={`px-2 py-3 ${activeTab === "description" ? "border-b-2 border-[#159447] text-[#08723d]" : "text-slate-400 hover:text-slate-600"}`}>Mô tả</button>
        </div>

        {activeTab === "general" ? (
          <dl className="space-y-2.5 py-4">
            {details.map(({ icon: Icon, label, value }) => (
              <div key={label} className="grid grid-cols-[18px_110px_minmax(0,1fr)] items-center gap-2 text-xs">
                <Icon size={14} className="text-slate-400" />
                <dt className="text-slate-400">{label}</dt>
                <dd className="truncate font-semibold text-slate-600">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="py-4 text-sm leading-6 text-slate-600">{employee.description || "Chưa có mô tả cho nhân viên này."}</p>
        )}
      </div>
    </aside>
  );
}
