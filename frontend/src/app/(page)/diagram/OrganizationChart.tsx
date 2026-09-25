"use client";

import Image from "next/image";
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleUserRound,
  Coins,
  Factory,
  Landmark,
  Megaphone,
  MonitorCog,
  ShoppingCart,
  ShieldCheck,
  Target,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

type Executive = {
  role: string;
  name: string;
  avatar: string;
};

type Division = {
  name: string;
  staff: number;
  icon: LucideIcon;
  tone: string;
  demoExpandable?: boolean;
};

type DetailGroup = {
  name: string;
  staff: number;
  icon: LucideIcon;
  tone: string;
  surface: string;
  slug?: string;
  roles: Array<{ name: string; staff: number }>;
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
  { name: "Hành chính - Nhân sự", staff: 18, icon: UsersRound, tone: "bg-rose-50 text-rose-500" },
  { name: "Tài chính - Kế toán", staff: 24, icon: Coins, tone: "bg-emerald-50 text-emerald-600" },
  { name: "Truyền thông - Kinh doanh", staff: 48, icon: Megaphone, tone: "bg-violet-50 text-violet-600", demoExpandable: true },
  { name: "Sản phẩm - R&D", staff: 28, icon: Factory, tone: "bg-orange-50 text-orange-500" },
  { name: "Pháp chế - Quản trị", staff: 8, icon: ShieldCheck, tone: "bg-sky-50 text-sky-500" },
  { name: "Công nghệ thông tin", staff: 14, icon: MonitorCog, tone: "bg-green-50 text-green-600" },
  { name: "Vận hành - Chuỗi cung ứng", staff: 20, icon: BriefcaseBusiness, tone: "bg-blue-50 text-blue-600" },
];

const detailGroups: DetailGroup[] = [
  {
    name: "Phòng Truyền thông",
    staff: 12,
    slug: "truyen-thong",
    icon: Megaphone,
    tone: "bg-violet-50 text-violet-600",
    surface: "bg-violet-50/70",
    roles: [
      { name: "Brand", staff: 5 },
      { name: "Content / Social Media", staff: 4 },
      { name: "Event", staff: 3 },
    ],
  },
  {
    name: "Phòng Marketing",
    staff: 14,
    icon: Target,
    tone: "bg-sky-50 text-sky-600",
    surface: "bg-sky-50/70",
    roles: [
      { name: "Digital Marketing", staff: 6 },
      { name: "Thiết kế", staff: 5 },
      { name: "Nghiên cứu thị trường", staff: 3 },
    ],
  },
  {
    name: "Phòng Kinh doanh",
    staff: 18,
    icon: Landmark,
    tone: "bg-emerald-50 text-emerald-600",
    surface: "bg-emerald-50/70",
    roles: [
      { name: "Sales Domestic", staff: 10 },
      { name: "Sales Export", staff: 6 },
      { name: "Sales Admin", staff: 2 },
    ],
  },
  {
    name: "Phòng Mua hàng",
    staff: 4,
    icon: ShoppingCart,
    tone: "bg-amber-50 text-amber-600",
    surface: "bg-amber-50/70",
    roles: [
      { name: "Purchasing", staff: 2 },
      { name: "Vendor Management", staff: 1 },
      { name: "Hợp đồng & bảo giá", staff: 1 },
    ],
  },
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
      <p className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700">
        <CircleUserRound size={14} /> {division.staff} nhân sự
      </p>
      <span className={`mt-auto inline-flex h-7 w-12 items-center justify-center rounded-full border ${isExpanded ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-slate-100 bg-white/80 text-slate-400"}`}>
        <ArrowIcon size={16} strokeWidth={2.2} />
      </span>
    </button>
  );
}

function DetailCard({ group, onDepartmentSelect }: { group: DetailGroup; onDepartmentSelect?: (slug: string) => void }) {
  const Icon = group.icon;
  const wrapperClass = `block rounded-2xl ${group.surface} p-4 transition-transform`;
  const content = (
    <>
      <header className="flex items-center gap-3 border-b border-white/80 pb-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${group.tone}`}>
          <Icon size={21} strokeWidth={1.9} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[18px] font-extrabold leading-tight text-slate-900">{group.name}</h3>
          <p className="mt-1 text-[14px] font-medium text-slate-600">{group.staff} nhân sự</p>
        </div>
        <ChevronRight size={18} className="text-slate-500" />
      </header>
      <ul className="mt-3 space-y-2">
        {group.roles.map((role) => (
          <li key={role.name} className="flex items-center justify-between gap-3 rounded-xl bg-white/75 px-3 py-2.5 text-[14px] font-medium text-slate-700">
            <span className="inline-flex min-w-0 items-center gap-2">
              <CircleUserRound size={16} className="shrink-0 text-slate-500" />
              <span className="truncate">{role.name}</span>
            </span>
            <span className="text-[15px] font-bold text-slate-700">{role.staff}</span>
          </li>
        ))}
      </ul>
    </>
  );

  return group.slug ? (
    <button type="button" onClick={() => onDepartmentSelect?.(group.slug!)} className={`${wrapperClass} w-full cursor-pointer text-left hover:-translate-y-0.5 hover:shadow-md`}>
      {content}
    </button>
  ) : <article className={wrapperClass}>{content}</article>;
}

export default function OrganizationChart({ onDepartmentSelect }: { onDepartmentSelect?: (slug: string) => void }) {
  const [expandedDivision, setExpandedDivision] = useState<string | null>(null);
  const expandedDivisionIndex = divisions.findIndex((division) => division.name === expandedDivision);
  return (
    <div className="overflow-x-auto pb-4">
      <div className="min-w-[1120px] px-6 pb-6 pt-3">
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
          <div className="absolute top-0 h-[2px] bg-[#24934d]" style={{ left: "calc((100% - 4.5rem) / 14)", right: "calc((100% - 4.5rem) / 14)" }} />
          <div className="grid grid-cols-7 gap-3">
            {divisions.map((division) => (
              <div key={division.name} className="relative">
                <div className="absolute -top-8 left-1/2 h-8 w-[2px] -translate-x-1/2 bg-[#24934d]">
                </div>
                <DivisionCard division={division} isExpanded={expandedDivision === division.name} onToggle={() => setExpandedDivision((current) => current === division.name ? null : division.name)} />
              </div>
            ))}
          </div>
        </div>
        {expandedDivision ? (
          <>
            <div className="grid grid-cols-7 gap-3">
              <div style={{ gridColumnStart: expandedDivisionIndex + 1 }} className="justify-self-center h-7 w-[2px] bg-violet-300" />
            </div>
            <div className="grid grid-cols-4 gap-3 rounded-2xl border border-violet-200 bg-white/90 p-3 shadow-[0_12px_34px_rgba(15,23,42,0.07)]">
              {detailGroups.map((group) => <DetailCard key={group.name} group={group} onDepartmentSelect={onDepartmentSelect} />)}
            </div>
          </>
        ) : null}      </div>
    </div>
  );
}
