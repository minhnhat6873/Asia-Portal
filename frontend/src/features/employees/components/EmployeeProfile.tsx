"use client";

import { BriefcaseBusiness, Building2, CalendarDays, Mail, MapPin, Phone, UserRound } from "lucide-react";
import type { Employee } from "@/types/employee";
import EmployeeProfileCard from "@/components/ui/EmployeeProfileCard";
import { formatJoinDate, getEmployeeAvatar } from "../utils/employeeUtils";

export default function EmployeeProfile({ employee }: { employee: Employee }) {
  const details = [
    { icon: UserRound, label: "M\u00e3 nh\u00e2n vi\u00ean", value: employee.employeeCode },
    { icon: CalendarDays, label: "Ng\u00e0y gia nh\u1eadp", value: formatJoinDate(employee.joinDate) },
    { icon: BriefcaseBusiness, label: "Ch\u1ee9c v\u1ee5", value: employee.position },
    { icon: Building2, label: "Ph\u00f2ng ban", value: employee.department },
    { icon: MapPin, label: "V\u0103n ph\u00f2ng", value: employee.location },
    { icon: Mail, label: "Email", value: employee.email },
    { icon: Phone, label: "S\u1ed1 \u0111i\u1ec7n tho\u1ea1i", value: employee.phone },
  ];

  return (
    <EmployeeProfileCard
      avatar={getEmployeeAvatar(employee)}
      name={employee.name}
      position={employee.position}
      status={employee.status}
      details={details}
      description={employee.description}
      imageSizes="360px"
      className="xl:sticky xl:top-24"
    />
  );
}
