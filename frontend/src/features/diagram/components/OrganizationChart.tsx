"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  CircleUserRound,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ORGANIZATION_DEPARTMENTS } from "@/config/diagramDepartments";
import { getPublicEmployeeDepartments, getPublicEmployees } from "@/services/employee.service";
import { normalizeEmployeeDepartment } from "@/components/ui/employee-department-options";

type Executive = {
  role: string;
  name: string;
  avatar?: string;
};

type Division = (typeof ORGANIZATION_DEPARTMENTS)[number];

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

function DivisionCard({ division }: { division: Division }) {
  const Icon = division.icon;

  return (
    <Link
      href={`/diagram/${division.slug}`}
      className="group relative flex min-h-[170px] w-full flex-col items-center rounded-xl border border-transparent bg-white/90 px-2 py-3 text-center shadow-[0_5px_18px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
    >
      <div className={`flex h-[52px] w-[52px] items-center justify-center rounded-full ${division.tone}`}>
        <Icon size={26} strokeWidth={1.9} />
      </div>
      <h3 className="mt-2 text-[14px] font-extrabold leading-[1.25] text-slate-800">Phòng<br />{division.name}</h3>
      <span className="mt-3 inline-flex items-center justify-center gap-1 text-[10px] font-medium leading-4 text-emerald-700">
        <span className="group-hover:underline group-focus-visible:underline underline-offset-2">Xem nhân sự phòng {division.name}</span>
        <ChevronRight size={12} className="shrink-0" />
      </span>
    </Link>
  );
}

export default function OrganizationChart() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chartContentRef = useRef<HTMLDivElement>(null);
  const [ceo, setCeo] = useState<Executive | null>(null);
  const [seniorManagers, setSeniorManagers] = useState<Executive[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentsError, setDepartmentsError] = useState("");
  const divisions = ORGANIZATION_DEPARTMENTS.filter((division) => departments.includes(division.id));
  const managerCount = Math.max(seniorManagers.length, 1);
  const chartMinWidth = Math.max(
    470,
    managerCount * 330 + (managerCount - 1) * 64,
    divisions.length * 168 + Math.max(divisions.length - 1, 0) * 12,
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
    getPublicEmployeeDepartments(controller.signal).then((result) => {
      if (!controller.signal.aborted) setDepartments(result.map(normalizeEmployeeDepartment));
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setDepartmentsError(error instanceof Error ? error.message : "Không thể tải phòng ban");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setDepartmentsLoading(false);
    });
    Promise.all([
      getPublicEmployees({ rank: "CEO", limit: 1 }, controller.signal),
      getPublicEmployees({ rank: "Senior Management", limit: 100 }, controller.signal),
    ]).then(([ceoResult, seniorManagementResult]) => {
      const ceoEmployee = ceoResult.items[0];
      setCeo(ceoEmployee ? {
        role: ceoEmployee.position,
        name: ceoEmployee.name,
        avatar: ceoEmployee.chartAvatar || ceoEmployee.avatar,
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
          {ceo ? <ExecutiveCard executive={ceo} primary /> : (
            <div className="flex h-[102px] w-[470px] items-center justify-center rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 text-sm font-semibold text-emerald-700">Chưa có CEO</div>
          )}
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

        {divisions.length > 0 ? <>
        <div className="relative mx-auto h-10 w-[2px] bg-[#24934d]" />

        <div className="relative mx-auto w-fit pt-8">
          {divisions.length > 1 ? <div className="absolute top-0 h-[2px] bg-[#24934d]" style={{ left: "84px", right: "84px" }} /> : null}
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${divisions.length}, 168px)` }}>
            {divisions.map((division) => (
              <div key={division.name} className="relative">
                <div className="absolute -top-8 left-1/2 h-8 w-[2px] -translate-x-1/2 bg-[#24934d]">
                </div>
                <DivisionCard division={division} />
              </div>
            ))}
          </div>
        </div>
        </> : null}
        <p role="status" className={`mt-6 text-center text-sm ${departmentsError ? "text-rose-600" : "text-slate-500"}`}>
          {departmentsLoading ? "Đang tải phòng ban..." : departmentsError || (divisions.length === 0 ? "Chưa có phòng ban có nhân viên đang làm việc." : "")}
        </p>
        </div>
      </div>
    </div>
  );
}
