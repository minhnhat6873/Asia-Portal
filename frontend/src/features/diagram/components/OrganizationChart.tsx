"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  CircleUserRound,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ORGANIZATION_DEPARTMENTS, ORGANIZATION_DIVISIONS } from "@/config/diagramDepartments";
import { getPublicEmployees } from "@/services/employee.service";

type Executive = {
  role: string;
  name: string;
  avatar?: string;
};

type Department = (typeof ORGANIZATION_DEPARTMENTS)[number];
type Division = (typeof ORGANIZATION_DIVISIONS)[number];

function LeadershipIcon({ kind }: { kind: "board" | "ceo" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 72 72" className="h-[62px] w-[62px]">
      {kind === "board" ? <>
        <g fill="#0b6435">
          <circle cx="36" cy="27" r="7" />
          <circle cx="17" cy="32" r="5.5" />
          <circle cx="55" cy="32" r="5.5" />
          <path d="M22 49v-4c0-7 6-11 14-11s14 4 14 11v4zM5 53V45c0-6 5-9 12-9 4 0 7 1 9 3-4 3-6 7-6 12zM52 51c0-5-2-9-6-12 2-2 5-3 9-3 7 0 12 3 12 9v8z" />
          <ellipse cx="36" cy="57" rx="30" ry="9" />
        </g>
        <path d="M8 57c8-6 18-8 28-8s20 2 28 8" fill="none" stroke="#eaf7ef" strokeWidth="2.5" />
        <path d="m25 7 6 5 5-9 5 9 6-5-3 12H28z" fill="#d6ad21" />
      </> : <>
        <circle cx="34" cy="24" r="10" fill="#0b6435" />
        <path d="M11 60v-8c0-10 10-16 23-16s23 6 23 16v8c-13 9-33 9-46 0" fill="#0b6435" />
        <path d="m27 38 7 5 7-5-4 13h-6z" fill="#f5fcf7" />
        <path d="m33 45-4 15 5 5 5-5-4-15z" fill="#f5fcf7" />
        <path d="m56 32 3.5 7.5 8.5 1-6.2 5.8 1.6 8.2-7.4-4-7.4 4 1.6-8.2-6.2-5.8 8.5-1z" fill="#d6ad21" stroke="#fff8d9" strokeWidth="1" />
      </>}
    </svg>
  );
}

function LeadershipPlaceholder({ label, kind }: { label: string; kind: "board" | "ceo" }) {
  return (
    <article className="relative flex h-[102px] w-[470px] items-center gap-5 overflow-hidden rounded-2xl border-[1.5px] border-[#88d597] bg-gradient-to-br from-white via-white to-[#f3faf5] px-6 shadow-[0_8px_24px_rgba(15,118,65,0.10)]">
      <svg aria-hidden="true" viewBox="0 0 110 102" preserveAspectRatio="none" className="pointer-events-none absolute inset-y-0 right-0 h-full w-[90px]">
        <path d="M0 102c60-3 94-42 110-85v85z" fill="#188744" />
        <path d="M0 102c55-3 91-33 110-67v14c-22 29-51 49-87 53z" fill="#dfbb35" />
        <path d="M0 102C13 56 78 28 110 0c-1 60-43 97-110 102" fill="#e7f5eb" />
        <path d="M0 102c65-5 102-44 110-88" fill="none" stroke="#d4eddd" strokeWidth="2" />
      </svg>
      <div aria-hidden="true" className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#eff9f2] to-[#e1f3e8]">
        <LeadershipIcon kind={kind} />
      </div>
      <div aria-hidden="true" className="relative h-[52px] w-px shrink-0 bg-[#d2e5d8]" />
      <h2 className="relative min-w-0 flex-1 whitespace-nowrap text-left text-[20px] font-black uppercase tracking-tight text-[#182433]">{label}</h2>
    </article>
  );
}

function ExecutiveCard({ executive, primary = false }: { executive: Executive; primary?: boolean }) {
  return (
    <article className={`flex overflow-hidden rounded-2xl border-[1.5px] shadow-[0_8px_20px_rgba(15,118,65,0.10)] ${primary ? "h-[102px] w-[470px] border-[#43cf87] bg-emerald-600" : "h-[92px] w-full items-center justify-center gap-3 border-[#72dfa7] bg-emerald-50"}`}>
      <div className={`flex shrink-0 items-center justify-center bg-emerald-50 ${primary ? "w-[116px]" : "w-[78px]"}`}>
        <div className={`relative overflow-hidden rounded-full border-4 border-white shadow-sm ${primary ? "h-[92px] w-[92px]" : "h-[78px] w-[78px]"}`}>
          {executive.avatar ? (
            <Image src={executive.avatar} alt={executive.name} fill sizes={primary ? "92px" : "78px"} className="object-cover object-center" />
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-emerald-100 text-emerald-700"><CircleUserRound size={primary ? 32 : 26} /><span className="text-[9px]">Chưa có ảnh</span></span>
          )}
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

function DepartmentLink({ department }: { department: Department }) {
  const Icon = department.icon;

  return (
    <Link
      href={`/diagram/${department.slug}`}
      aria-label={`Xem nhân sự phòng ${department.name}`}
      className="group relative flex min-h-[68px] items-center gap-2.5 rounded-xl border border-[#e5eeeb] bg-gradient-to-br from-white to-[#fdfefe] px-2.5 py-3 text-left shadow-[0_3px_8px_rgba(32,72,62,0.10)] transition-colors hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
    >
      <div className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full ${department.tone}`}>
        <Icon aria-hidden="true" size={23} strokeWidth={1.9} />
      </div>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold leading-[18px] text-[#14273c]">Phòng {department.name}</span>
        <span className="mt-1 block text-xs leading-[17px] text-[#718096]">{department.description}</span>
      </span>
      <ChevronRight aria-hidden="true" size={17} strokeWidth={1.8} className="shrink-0 text-[#3b977c]" />
    </Link>
  );
}

function DivisionCard({ division }: { division: Division }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = division.icon;
  const departments = division.departmentIds.flatMap((id) => ORGANIZATION_DEPARTMENTS.filter((department) => department.id === id));
  const buttonId = `division-${division.id}`;
  const panelId = `${buttonId}-departments`;

  return (
    <section className="relative w-[260px]">
      <span aria-hidden="true" className="pointer-events-none absolute -top-1.5 left-1/2 z-20 h-3 w-3 -translate-x-1/2 rounded-full border-[3px] border-[#ccefdc] bg-[#008d4b] shadow-[0_0_0_2px_#e3f7eb,0_0_10px_rgba(26,173,100,0.20)]" />
      <h3>
        <button id={buttonId} type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded((value) => !value)} className={`relative z-10 flex h-[90px] w-full items-center gap-4 overflow-hidden rounded-2xl border bg-gradient-to-br from-[#fcfefd] via-[#f5fbf8] to-[#eff9f4] px-5 py-3.5 text-left shadow-[0_5px_13px_rgba(16,125,77,0.10)] transition-colors hover:border-[#8acdae] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 ${expanded ? "border-[#b6dfcc]" : "border-[#cce9dc]"}`}>
          <svg aria-hidden="true" viewBox="0 0 90 88" preserveAspectRatio="none" className="pointer-events-none absolute inset-y-0 right-0 h-full w-[80px]">
            <path d="M0 88c39-8 76-29 90-54v54z" fill="#d6f0e2" />
            <path d="M13 88c33-5 62-18 77-36v36z" fill="#b4e4cc" />
            <path d="M29 88c24-4 46-12 61-25v25z" fill="#008b4b" />
            <path d="M37 88c22-4 39-10 53-20v20z" fill="#008448" />
          </svg>
          <span aria-hidden="true" className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e0f6eb] to-[#daf2e7] text-[#008a49]">
            <Icon size={29} strokeWidth={2.2} />
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="block text-sm font-extrabold uppercase leading-[19px] tracking-tight text-[#10253b]">{division.name}</span>
            <span className="mt-1.5 block text-xs leading-4 text-[#7a8b9b]">{departments.length} phòng ban</span>
          </span>
          <ChevronDown aria-hidden="true" size={16} strokeWidth={2.5} className={`relative shrink-0 text-[#254456] transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!expanded} className="rounded-2xl bg-gradient-to-b from-[#f1faf6] to-[#f6fbf9] pb-3 pl-[25px] pr-[5px] pt-5 shadow-[0_6px_14px_rgba(15,118,65,0.03)]">
        <ul className="space-y-3.5">
          {departments.map((department, index) => <li key={department.id} className="relative">
            <span aria-hidden="true" className="pointer-events-none absolute -left-3 w-px bg-[#2d9d6d]" style={{ top: index === 0 ? -20 : -14, bottom: index === departments.length - 1 ? "50%" : -14 }} />
            <span aria-hidden="true" className="pointer-events-none absolute -left-3 top-1/2 h-px w-3 bg-[#b3ddca]" />
            <span aria-hidden="true" className="pointer-events-none absolute -left-4 top-1/2 z-10 h-2 w-2 -translate-y-1/2 rounded-full border-[1.5px] border-[#eff9f4] bg-[#008b4b]" />
            <DepartmentLink department={department} />
          </li>)}
        </ul>
      </div>
    </section>
  );
}

export default function OrganizationChart() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chartContentRef = useRef<HTMLDivElement>(null);
  const [ceo, setCeo] = useState<Executive | null>(null);
  const [seniorManagers, setSeniorManagers] = useState<Executive[]>([]);
  const managerCount = Math.max(seniorManagers.length, 1);
  const chartMinWidth = Math.max(
    470,
    managerCount * 330 + (managerCount - 1) * 64,
    ORGANIZATION_DIVISIONS.length * 260 + (ORGANIZATION_DIVISIONS.length - 1) * 24,
  ) + 48;

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const content = chartContentRef.current;
    if (!container || !content) return;

    let previousContainerWidth = -1;
    let previousContentWidth = -1;
    const centerChart = () => {
      const containerWidth = container.clientWidth;
      const contentWidth = content.offsetWidth;
      // Recenter only when widths change to preserve manual horizontal scrolling.
      if (containerWidth === previousContainerWidth && contentWidth === previousContentWidth) return;
      previousContainerWidth = containerWidth;
      previousContentWidth = contentWidth;
      container.scrollLeft = Math.max(0, (contentWidth - containerWidth) / 2);
    };

    centerChart();
    const observer = new ResizeObserver(centerChart);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getPublicEmployees({ rank: "CEO", limit: 1 }, controller.signal),
      getPublicEmployees({ rank: "Senior Management", limit: 100 }, controller.signal),
    ]).then(([ceoResult, seniorManagementResult]) => {
      if (controller.signal.aborted) return;
      const ceoEmployee = ceoResult.items[0];
      setCeo(ceoEmployee ? {
        role: ceoEmployee.position,
        name: ceoEmployee.name,
        avatar: ceoEmployee.chartAvatar?.trim(),
      } : null);
      setSeniorManagers(seniorManagementResult.items.map((employee) => ({
        role: employee.position,
        name: employee.name,
        avatar: employee.chartAvatar || employee.avatar,
      })));
    }).catch((error) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) console.error("Không thể tải nhân sự sơ đồ", error);
    });
    return () => controller.abort();
  }, []);
  return (
    <div className="pb-6">
      <div ref={scrollContainerRef} className="overflow-x-auto">
        <div ref={chartContentRef} className="w-full px-6 pt-3" style={{ minWidth: chartMinWidth }}>
        <div className="mx-auto w-fit">
          <LeadershipPlaceholder label="Hội đồng quản trị" kind="board" />
        </div>

        <div className="mx-auto h-10 w-[2px] bg-[#24934d]" />

        <div className="mx-auto w-fit">
          {ceo?.avatar ? <ExecutiveCard executive={ceo} primary /> : <LeadershipPlaceholder label="Ban giám đốc / CEO" kind="ceo" />}
        </div>

        <div className="relative mx-auto h-10 w-[2px] bg-[#24934d]">
        </div>

        <div className="relative mx-auto w-fit pt-10">
          {seniorManagers.length > 1 ? <div className="absolute top-0 h-[2px] bg-[#24934d]" style={{ left: "165px", right: "165px" }} /> : null}
          <div className="grid gap-16" style={{ gridTemplateColumns: `repeat(${Math.max(seniorManagers.length, 1)}, 330px)` }}>
            {seniorManagers.map((executive) => (
              <div key={executive.name} className="relative">
                <div className="absolute -top-10 left-1/2 h-10 w-[2px] -translate-x-1/2 bg-[#24934d]">
                </div>
                <ExecutiveCard executive={executive} />
              </div>
            ))}
            {seniorManagers.length === 0 ? <p className="w-[330px] text-center text-sm text-slate-500">Chưa có Quản lý cấp cao</p> : null}
          </div>
        </div>

        <div className="relative mx-auto h-10 w-[2px] bg-[#24934d]" />

        <div className="relative mx-auto w-fit pt-8">
          <div className="absolute top-0 h-[2px] bg-[#24934d]" style={{ left: "130px", right: "130px" }} />
          <div className="grid items-start gap-6" style={{ gridTemplateColumns: `repeat(${ORGANIZATION_DIVISIONS.length}, 260px)` }}>
            {ORGANIZATION_DIVISIONS.map((division) => (
              <div key={division.id} className="relative">
                <div className="absolute -top-8 left-1/2 h-8 w-[2px] -translate-x-1/2 bg-[#24934d]">
                </div>
                <DivisionCard division={division} />
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
