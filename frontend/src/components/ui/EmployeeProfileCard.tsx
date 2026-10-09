"use client";

import Image from "next/image";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { hasRichTextContent, RichText } from "@/components/ui/RichText";

export type EmployeeProfileStatus = "active" | "probation" | "inactive";

export type EmployeeProfileDetail = {
  icon: LucideIcon;
  label: string;
  value: string;
};

type EmployeeProfileCardProps = {
  avatar?: string;
  name: string;
  position: string;
  status?: EmployeeProfileStatus;
  details: EmployeeProfileDetail[];
  description?: string;
  imageSizes?: string;
  className?: string;
  footer?: ReactNode;
};

const statusCopy: Record<EmployeeProfileStatus, string> = {
  active: "\u0110ang l\u00e0m vi\u1ec7c",
  probation: "Th\u1eed vi\u1ec7c",
  inactive: "\u0110\u00e3 ngh\u1ec9 vi\u1ec7c",
};

const statusDotClass: Record<EmployeeProfileStatus, string> = {
  active: "bg-[#16b85c]",
  probation: "bg-amber-500",
  inactive: "bg-slate-400",
};

export default function EmployeeProfileCard({
  avatar = "",
  name,
  position,
  status,
  details,
  description = "",
  imageSizes = "360px",
  className = "",
  footer,
}: EmployeeProfileCardProps) {
  const [activeTab, setActiveTab] = useState<"general" | "description">("general");
  const portrait = avatar.trim();

  return (
    <aside className={"overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm " + className}>
      <div className="relative aspect-[4/3] w-full bg-slate-100">
        {portrait ? (
          <Image
            src={portrait}
            alt={"Ch\u00e2n dung " + name}
            fill
            sizes={imageSizes}
            className="object-cover object-top"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-slate-50 text-slate-400">
            <UserRound size={30} strokeWidth={1.5} />
            <span className="text-sm font-medium">{"Ch\u01b0a c\u00f3 \u1ea3nh \u0111\u1ea1i di\u1ec7n"}</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="break-words text-lg font-black leading-snug text-slate-800">{name}</h2>
          <p className="mt-1 text-sm text-slate-500">{position}</p>
          {status && (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-[#159447]">
              <span className={"h-2 w-2 rounded-full " + statusDotClass[status]} />
              {statusCopy[status]}
            </span>
          )}
        </div>

        <div className="flex border-b border-slate-100 text-xs font-semibold text-slate-400">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={"px-2 py-3 " + (activeTab === "general" ? "border-b-2 border-[#159447] text-[#08723d]" : "text-slate-400 hover:text-slate-600")}
          >
            {"Th\u00f4ng tin chung"}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("description")}
            className={"px-2 py-3 " + (activeTab === "description" ? "border-b-2 border-[#159447] text-[#08723d]" : "text-slate-400 hover:text-slate-600")}
          >
            {"M\u00f4 t\u1ea3"}
          </button>
        </div>

        {activeTab === "general" ? (
          <dl className="space-y-2.5 py-4">
            {details.map(({ icon: Icon, label, value }) => (
              <div key={label} className="grid grid-cols-[18px_110px_minmax(0,1fr)] items-center gap-2 text-xs">
                <Icon size={14} className="text-slate-400" />
                <dt className="text-slate-400">{label}</dt>
                <dd className="truncate font-semibold text-slate-600">{value?.trim() || "Không có"}</dd>
              </div>
            ))}
          </dl>
        ) : hasRichTextContent(description) ? (
          <RichText
            html={description}
            className="py-4 text-sm leading-6 text-slate-600 [&_a]:text-[#08723d] [&_a]:underline [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
          />
        ) : (
          <p className="py-4 text-sm leading-6 text-slate-600">{"Ch\u01b0a c\u00f3 m\u00f4 t\u1ea3 cho nh\u00e2n vi\u00ean n\u00e0y."}</p>
        )}
      </div>

      {footer && (
        <div className="flex items-center justify-end border-t border-slate-100 px-4 py-3">
          {footer}
        </div>
      )}
    </aside>
  );
}

export {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  UserRound,
};
