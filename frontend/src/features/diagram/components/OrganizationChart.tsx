"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleUserRound,
  Coins,
  Factory,
  Megaphone,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { DIAGRAM_DEPARTMENTS } from "@/config/diagramDepartments";
import type { DiagramDepartment } from "@/config/diagramDepartments";

type Executive = {
  role: string;
  name: string;
  avatar: string;
};

type Division = {
  id: string;
  name: string;
  description: string;
  departments: string;
  icon: LucideIcon;
  tone: string;
};

const executiveDirector: Executive = {
  role: "Tổng giám đốc",
  name: "Ông Trần Văn Khánh",
  avatar: "/assets/images/avatar-Khanh.png",
};

const deputyDirectors: Executive[] = [
  {
    role: "Phó Tổng giám đốc",
    name: "Ông Nguyễn Duy Tài",
    avatar: "/assets/images/SALES XK_NV HUY.jpg",
  },
  {
    role: "Phó Tổng giám đốc",
    name: "Ông Phan Văn Đức",
    avatar: "/assets/images/LOG_NV HUY.jpg",
  },
  {
    role: "Phó Tổng giám đốc",
    name: "Ông Kiều Ngọc Minh",
    avatar: "/assets/images/BOD_NV KIỀU.png",
  },
];

const divisions: Division[] = [
  { id: "human-resources", name: "Hành chính & Nhân sự", description: "Điều phối hành chính và phát triển đội ngũ.", departments: "HR + Admin", icon: UsersRound, tone: "bg-rose-50 text-rose-500" },
  { id: "finance", name: "Tài chính & Kế toán", description: "Quản lý tài chính và công tác kế toán.", departments: "F&A", icon: Coins, tone: "bg-emerald-50 text-emerald-600" },
  { id: "product", name: "Sản phẩm & Phát triển", description: "Phát triển sản phẩm và cải tiến.", departments: "Design + R&D", icon: Factory, tone: "bg-orange-50 text-orange-500" },
  { id: "operations", name: "Vận hành & Chuỗi cung ứng", description: "Điều phối vận hành và chuỗi cung ứng.", departments: "Logistics + Purchasing", icon: BriefcaseBusiness, tone: "bg-blue-50 text-blue-600" },
  { id: "commercial", name: "Kinh doanh & Thương mại", description: "Phát triển thị trường và hoạt động kinh doanh.", departments: "Marketing + Export Sales", icon: Megaphone, tone: "bg-violet-50 text-violet-600" },
  { id: "legal", name: "Pháp chế", description: "Đảm bảo tuân thủ và công tác pháp chế.", departments: "Legal", icon: ShieldCheck, tone: "bg-sky-50 text-sky-500" },
];

function ExecutiveCard({ executive, primary = false }: { executive: Executive; primary?: boolean }) {
  return (
    <article className={`flex overflow-hidden rounded-2xl border-[1.5px] shadow-[0_8px_20px_rgba(15,118,65,0.10)] ${primary ? "h-[102px] w-[470px] border-[#43cf87] bg-emerald-600" : "h-[92px] w-full items-center justify-center gap-3 border-[#72dfa7] bg-emerald-50"}`}>
      <div className={`flex shrink-0 items-center justify-center bg-emerald-50 ${primary ? "w-[116px]" : "w-[78px]"}`}>
        <div className={`relative overflow-hidden rounded-full border-4 border-white shadow-sm ${primary ? "h-[92px] w-[92px]" : "h-[78px] w-[78px]"}`}>
          <Image src={executive.avatar} alt={executive.name} fill sizes={primary ? "92px" : "78px"} className="object-cover object-top" />
        </div>
      </div>
      <div className={`flex min-w-0 flex-col justify-center ${primary ? "flex-1 items-center px-5 text-center" : "w-[190px] shrink-0 items-start text-left"} ${primary ? "bg-gradient-to-r from-[#159947] to-[#0f8a3e] text-white" : "bg-emerald-50"}`}>
        <p className={`font-black uppercase tracking-[0.035em] ${primary ? "text-[14px] text-white" : "w-full text-[11px] leading-none text-emerald-700"}`}>
          {executive.role}
        </p>
        <p className={`mt-1.5 whitespace-nowrap font-semibold ${primary ? "text-[17px] text-white" : "w-full text-[14px] text-emerald-900"}`}>{executive.name}</p>
      </div>
    </article>
  );
}

function DivisionCard({ division, isExpanded, onToggle }: { division: Division; isExpanded: boolean; onToggle: () => void }) {
  const Icon = division.icon;
  const canExpand = true;
  const ArrowIcon = isExpanded ? ChevronUp : ChevronDown;

  return (
    <button
      type="button"
      onClick={canExpand ? onToggle : undefined}
      aria-expanded={canExpand ? isExpanded : undefined}
      className={`relative flex min-h-[128px] w-full flex-col items-center rounded-xl border px-2 py-3 text-center transition-all ${isExpanded ? "border-violet-300 bg-violet-50/80 shadow-[0_10px_24px_rgba(139,92,246,0.14)]" : "border-transparent bg-white/90 shadow-[0_5px_18px_rgba(15,23,42,0.05)]"} ${canExpand ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : "cursor-default"}`}
    >
      <div className={`flex h-[52px] w-[52px] items-center justify-center rounded-full ${division.tone}`}>
        <Icon size={26} strokeWidth={1.9} />
      </div>
      <h3 className="mt-2 text-[14px] font-extrabold leading-[1.25] text-slate-800">Khối<br />{division.name}</h3>
      <span className={`mt-auto inline-flex h-7 w-12 items-center justify-center rounded-full border ${isExpanded ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-slate-100 bg-white/80 text-slate-400"}`}>
        <ArrowIcon size={16} strokeWidth={2.2} />
      </span>
    </button>
  );
}

function DetailCard({ group }: { group: DiagramDepartment }) {
  const Icon = group.icon;
  const wrapperClass = `block rounded-2xl ${group.surface} px-3 py-[27px] transition-transform`;
  const content = (
    <>
      <header className="flex items-center gap-2.5 border-b border-white/80 pb-2.5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${group.tone}`}>
          <Icon size={19} strokeWidth={1.9} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-extrabold leading-tight text-slate-900">{group.name}</h3>
          <p className="mt-0.5 text-xs font-medium text-slate-600">{group.staff} nhân sự</p>
        </div>
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-sm">
          <ChevronRight size={15} />
        </span>
      </header>
      <ul className="mt-2.5 space-y-1.5">
        {group.roles.map((role) => (
          <li key={role.name} className="flex min-h-9 items-center justify-between gap-2.5 rounded-xl bg-white/80 px-2.5 py-1.5 text-xs font-medium text-slate-700">
            <span className="inline-flex min-w-0 items-center gap-2">
              <CircleUserRound size={14} className="shrink-0 text-slate-500" />
              <span className="truncate">{role.name}</span>
            </span>
            <span className="text-xs font-bold text-slate-700">{role.staff}</span>
          </li>
        ))}
      </ul>
    </>
  );

  return (
    <Link href={`/diagram/${group.slug}`} className={`${wrapperClass} w-full sm:w-[260px] cursor-pointer text-left hover:-translate-y-0.5 hover:shadow-md`}>
      {content}
    </Link>
  );
}

function EmptyDetailPanel({ division }: { division: Division }) {
  const Icon = division.icon;
  return (
    <article className="w-full rounded-2xl bg-slate-50/80 px-3 py-[27px] sm:w-[260px]">
      <header className="flex items-center gap-2 border-b border-white/80 pb-2">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${division.tone}`}>
          <Icon size={16} strokeWidth={1.9} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[12px] font-extrabold leading-tight text-slate-900">{division.departments}</h3>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500">Chưa có số liệu chi tiết</p>
        </div>
        <ChevronRight size={14} className="text-slate-400" />
      </header>
      <p className="mt-2 rounded-lg bg-white/75 px-2 py-2 text-[10px] leading-4 text-slate-500">
        Chưa có dữ liệu bộ phận con trong sơ đồ hiện tại.
      </p>
    </article>
  );
}

function DivisionPanelHeader({ division }: { division: Division }) {
  const Icon = division.icon;

  return (
    <header className="flex items-center justify-center rounded-2xl border border-violet-100 bg-violet-50/75 px-4 py-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${division.tone}`}>
          <Icon size={24} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-extrabold text-slate-900">Khối {division.name}</h2>
          <p className="mt-1 truncate text-sm text-slate-600">{division.description}</p>
        </div>
      </div>
    </header>
  );
}

export default function OrganizationChart() {
  const [expandedDivision, setExpandedDivision] = useState<string | null>(null);
  const activeDivision = divisions.find((division) => division.id === expandedDivision);
  const activeDivisionIndex = divisions.findIndex((division) => division.id === expandedDivision);
  const selectedDivisionPosition = activeDivisionIndex >= 0
    ? ((activeDivisionIndex + 0.5) / divisions.length) * 100
    : 50;
  const connectorStart = Math.min(selectedDivisionPosition, 50);
  const connectorWidth = Math.abs(selectedDivisionPosition - 50);
  const activeDetailGroups = DIAGRAM_DEPARTMENTS.filter((group) => group.divisionId === expandedDivision);
  const panelGridClass = activeDetailGroups.length <= 1
    ? "grid-cols-1"
    : activeDetailGroups.length === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : activeDetailGroups.length === 3
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  return (
    <div className="pb-6">
      <div className="overflow-x-auto">
        <div className="min-w-[1120px] px-6 pt-3">
        <div className="mx-auto w-fit">
          <ExecutiveCard executive={executiveDirector} primary />
        </div>

        <div className="relative mx-auto h-10 w-[2px] bg-[#24934d]">
        </div>

        <div className="relative mx-auto max-w-[1080px] pt-10">
          <div className="absolute top-0 h-[2px] bg-[#24934d]" style={{ left: "calc((100% - 8rem) / 6)", right: "calc((100% - 8rem) / 6)" }} />
          <div className="grid grid-cols-3 gap-16">
            {deputyDirectors.map((executive) => (
              <div key={executive.name} className="relative">
                <div className="absolute -top-10 left-1/2 h-10 w-[2px] -translate-x-1/2 bg-[#24934d]">
                </div>
                <ExecutiveCard executive={executive} />
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto h-10 w-[2px] bg-[#24934d]">
        </div>

        <div className="relative pt-8">
          <div className="absolute top-0 h-[2px] bg-[#24934d]" style={{ left: "calc((100% - 4.5rem) / 12)", right: "calc((100% - 4.5rem) / 12)" }} />
          <div className="grid grid-cols-6 gap-3">
            {divisions.map((division) => (
              <div key={division.name} className="relative">
                <div className="absolute -top-8 left-1/2 h-8 w-[2px] -translate-x-1/2 bg-[#24934d]">
                </div>
                <DivisionCard division={division} isExpanded={expandedDivision === division.id} onToggle={() => setExpandedDivision((current) => current === division.id ? null : division.id)} />
              </div>
            ))}
          </div>
          {expandedDivision && activeDivisionIndex >= 0 ? (
            <div className="relative h-10">
              <div
                className="absolute top-0 h-5 w-[2px] -translate-x-1/2 bg-violet-300"
                style={{ left: `${selectedDivisionPosition}%` }}
              />
              {connectorWidth > 0 ? (
                <div
                  className="absolute top-5 h-[2px] bg-violet-300"
                  style={{ left: `${connectorStart}%`, width: `${connectorWidth}%` }}
                />
              ) : null}
              <div className="absolute left-1/2 top-5 h-5 w-[2px] -translate-x-1/2 bg-violet-300" />
            </div>
          ) : null}
        </div>
        </div>
      </div>
      {expandedDivision && activeDivision ? (
        <>
          <section className="mx-auto w-full rounded-3xl border border-violet-200 bg-white/90 p-3 shadow-[0_12px_34px_rgba(15,23,42,0.07)] sm:w-fit sm:max-w-full sm:p-4">
            <DivisionPanelHeader division={activeDivision} />
            {activeDetailGroups.length ? (
              <div className={`mt-4 grid justify-items-center gap-4 ${panelGridClass}`}>
                {activeDetailGroups.map((group) => <DetailCard key={group.name} group={group} />)}
              </div>
            ) : (
              <div className="mt-4 flex justify-center"><EmptyDetailPanel division={activeDivision} /></div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
