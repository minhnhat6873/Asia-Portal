"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, List, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getPublicEmployees } from "@/services/employee.service";
import type { Employee, EmployeePagination } from "@/types/employee";
import EmployeeDirectory from "./components/EmployeeDirectory";
import EmployeeFilters from "./components/EmployeeFilters";
import EmployeeProfile from "./components/EmployeeProfile";
import EmployeeStats from "./components/EmployeeStats";
import EmployeesHero from "./components/EmployeesHero";
import { normalizeSearchText } from "@/utils/normalizeSearchText";
import { EMPLOYEE_DEPARTMENT_OPTIONS, normalizeEmployeeDepartment } from "@/components/ui/employee-department-options";
import { EMPLOYEE_SELECTABLE_RANK_OPTIONS } from "@/components/ui/employee-rank-options";

const PAGE_LIMIT = 10;
const ALL_DEPARTMENTS = "Tất cả phòng ban";
const ALL_RANKS = "Tất cả cấp bậc";
const DEPARTMENT_FILTER_OPTIONS = [ALL_DEPARTMENTS, ...EMPLOYEE_DEPARTMENT_OPTIONS.map(({ value }) => value)];

function EmployeesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [department, setDepartment] = useState(() => {
    const value = normalizeEmployeeDepartment(searchParams.get("department") ?? "");
    return DEPARTMENT_FILTER_OPTIONS.includes(value) ? value : ALL_DEPARTMENTS;
  });
  const [rank, setRank] = useState(() => {
    const value = searchParams.get("rank");
    return EMPLOYEE_SELECTABLE_RANK_OPTIONS.find((option) => option.value === value)?.value ?? ALL_RANKS;
  });
  const [newestFirst, setNewestFirst] = useState(() => searchParams.get("sort") !== "oldest");
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => searchParams.get("view") === "grid" ? "grid" : "list");
  const [requestedPage, setPage] = useState(() => Math.max(Number(searchParams.get("page")) || 1, 1));
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredEmployees = useMemo(() => {
    const query = normalizeSearchText(search);
    return allEmployees
      .filter((employee) => {
        const matchesSearch = !query || normalizeSearchText(`${employee.employeeCode} ${employee.name}`).includes(query);
        const matchesDepartment = department === ALL_DEPARTMENTS || normalizeEmployeeDepartment(employee.department) === department;
        const matchesRank = rank === ALL_RANKS || employee.rank === rank;
        return matchesSearch && matchesDepartment && matchesRank;
      })
      .sort((left, right) => {
        const dateDifference = new Date(left.joinDate).getTime() - new Date(right.joinDate).getTime();
        return newestFirst ? -dateDifference : dateDifference;
      });
  }, [allEmployees, department, newestFirst, rank, search]);

  const pageCount = Math.ceil(filteredEmployees.length / PAGE_LIMIT);
  const page = isLoading ? requestedPage : Math.min(requestedPage, Math.max(pageCount, 1));
  const visibleEmployees = filteredEmployees.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);
  const selected = visibleEmployees.find((employee) => employee.id === selectedId) ?? visibleEmployees[0] ?? null;
  const paginationItems: (number | "ellipsis")[] = pageCount <= 5
    ? Array.from({ length: pageCount }, (_, index) => index + 1)
    : page <= 2
      ? [1, 2, 3, 4, "ellipsis", pageCount]
      : page === 3
        ? [1, 2, 3, 4, 5, "ellipsis", pageCount]
        : page >= pageCount - 2
          ? [1, "ellipsis", pageCount - 3, pageCount - 2, pageCount - 1, pageCount]
          : [1, 2, "ellipsis", page, page + 1];
  const visiblePagination: EmployeePagination = {
    page,
    limit: PAGE_LIMIT,
    total: filteredEmployees.length,
    totalPages: pageCount,
  };

  const departmentCount = new Set(filteredEmployees.map((employee) => normalizeEmployeeDepartment(employee.department)).filter(Boolean)).size;
  const positionCount = new Set(filteredEmployees.map((employee) => employee.position).filter(Boolean)).size;
  const ranks = [ALL_RANKS, ...EMPLOYEE_SELECTABLE_RANK_OPTIONS.map((option) => option.value)];

  useEffect(() => {
    const controller = new AbortController();
    let isRefreshing = false;
    const refreshEmployees = async () => {
      if (isRefreshing || controller.signal.aborted || document.visibilityState === "hidden") return;
      isRefreshing = true;
      try {
        const firstPage = await getPublicEmployees({ limit: 100, page: 1, sort: "latest" }, controller.signal);
        const remainingPages = await Promise.all(Array.from(
          { length: Math.max(firstPage.pagination.totalPages - 1, 0) },
          (_, index) => getPublicEmployees({ limit: 100, page: index + 2, sort: "latest" }, controller.signal),
        ));
        if (controller.signal.aborted) return;
        setAllEmployees([...firstPage.items, ...remainingPages.flatMap((result) => result.items)]);
        setError("");
      } catch (requestError: unknown) {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : "Không thể tải danh sách nhân viên");
      } finally {
        isRefreshing = false;
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    void refreshEmployees();
    window.addEventListener("focus", refreshEmployees);
    document.addEventListener("visibilitychange", refreshEmployees);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refreshEmployees);
      document.removeEventListener("visibilitychange", refreshEmployees);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (department !== ALL_DEPARTMENTS) params.set("department", department);
    if (rank !== ALL_RANKS) params.set("rank", rank);
    if (!newestFirst) params.set("sort", "oldest");
    if (viewMode === "grid") params.set("view", "grid");
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    router.replace(query ? `/employees?${query}` : "/employees", { scroll: false });
  }, [department, newestFirst, page, rank, router, search, viewMode]);

  const openMobileProfile = () => {
    if (window.matchMedia("(max-width: 1199px)").matches) setProfileOpen(true);
  };

  const resetPage = (callback: (value: string) => void) => (value: string) => {
    callback(value);
    setPage(1);
  };

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    requestAnimationFrame(() => document.getElementById("employee-directory-results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const hasActiveFilters = Boolean(search.trim()) || department !== ALL_DEPARTMENTS || rank !== ALL_RANKS;
  const employeePagination = visiblePagination.total > 0 ? (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3">
      <p className="text-xs font-medium text-slate-600">Trang <strong className="text-emerald-700">{visiblePagination.page}</strong> / {visiblePagination.totalPages}</p>
      <nav aria-label="Chuyển trang nhân viên" className="flex items-center gap-1.5">
        <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => goToPage(page - 1)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
        {paginationItems.map((item, index) => item === "ellipsis"
          ? <span key={`ellipsis-${index}`} aria-hidden="true" className="min-w-5 text-center text-sm text-slate-400">…</span>
          : <button key={item} type="button" aria-current={page === item ? "page" : undefined} onClick={() => goToPage(item)} className={`grid h-9 min-w-9 place-items-center rounded-full border px-2 text-sm font-semibold shadow-sm transition ${page === item ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"}`}>{item}</button>)}
        <button type="button" aria-label="Trang sau" disabled={page >= visiblePagination.totalPages} onClick={() => goToPage(page + 1)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
      </nav>
    </div>
  ) : null;

  return (
    <>
      <EmployeesHero />
      <div className="mx-auto box-border w-full min-w-0 max-w-[1440px] px-3 py-3 sm:px-6 sm:py-5 md:px-8 md:py-7">
        <EmployeeFilters
          search={search}
          department={department}
          rank={rank}
          departments={DEPARTMENT_FILTER_OPTIONS}
          ranks={ranks}
          newestFirst={newestFirst}
          onSearchChange={resetPage(setSearch)}
          onDepartmentChange={resetPage(setDepartment)}
          onRankChange={resetPage(setRank)}
          onToggleSort={() => {
            setNewestFirst((current) => !current);
            setPage(1);
          }}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => {
            setSearch("");
            setDepartment(ALL_DEPARTMENTS);
            setRank(ALL_RANKS);
            setPage(1);
          }}
        />
        <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="min-w-0 flex-1">
            <EmployeeStats total={visiblePagination.total} departments={departmentCount} positions={positionCount} />
          </div>
          <div role="group" aria-label="Cách xem nhân viên" className="inline-flex w-fit shrink-0 self-end rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:self-auto">
            <button type="button" aria-pressed={viewMode === "list"} onClick={() => { setViewMode("list"); setProfileOpen(false); }} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${viewMode === "list" ? "bg-emerald-50 text-emerald-800" : "text-slate-500 hover:bg-slate-50"}`}>
              <List size={17} aria-hidden="true" /> Danh sách
            </button>
            <button type="button" aria-pressed={viewMode === "grid"} onClick={() => { setViewMode("grid"); setProfileOpen(false); }} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${viewMode === "grid" ? "bg-emerald-50 text-emerald-800" : "text-slate-500 hover:bg-slate-50"}`}>
              <LayoutGrid size={17} aria-hidden="true" /> Thẻ hồ sơ
            </button>
          </div>
        </div>
        <p className="mb-3 mt-4 text-sm font-medium text-slate-500 sm:mb-4">
          Hiển thị <span className="font-semibold text-slate-600">{visiblePagination.total ? (page - 1) * PAGE_LIMIT + 1 : 0} - {visiblePagination.total ? (page - 1) * PAGE_LIMIT + visibleEmployees.length : 0}</span> trong <span className="font-semibold text-slate-600">{visiblePagination.total}</span> nhân viên
        </p>
        <div className={`grid min-w-0 items-start gap-4 ${viewMode === "list" ? "xl:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
          <div className="min-w-0">
            {error ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-5 py-12 text-center text-sm text-rose-700">
                <p>{error}</p>
                <button type="button" onClick={() => window.location.reload()} className="mt-3 font-bold underline">Thử lại</button>
              </div>
            ) : isLoading && allEmployees.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-white py-20 text-center text-sm text-slate-400">Đang tải danh sách nhân viên...</div>
            ) : (
              <>
                <EmployeeDirectory
                  employees={visibleEmployees}
                  selectedId={selected?.id}
                  pagination={employeePagination}
                  viewMode={viewMode}
                  onSelect={(employee) => setSelectedId(employee.id)}
                  onOpenProfile={openMobileProfile}
                />
              </>
            )}
          </div>
          {viewMode === "list" && <div className="hidden xl:block">{selected ? <EmployeeProfile employee={selected} /> : <EmptyProfile />}</div>}
        </div>
      </div>

      {profileOpen && selected && (
        <div className="fixed inset-0 z-[60] xl:hidden" role="dialog" aria-modal="true" aria-label="Hồ sơ nhân viên">
          <button type="button" aria-label="Đóng hồ sơ" onClick={() => setProfileOpen(false)} className="absolute inset-0 bg-slate-950/45" />
          <section className="relative ml-auto flex h-full w-full max-w-md flex-col overflow-y-auto bg-[#f7faf8] shadow-[-12px_0_32px_rgba(15,23,42,0.2)]">
            <div className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4">
              <p className="text-base font-bold text-slate-800">Hồ sơ nhân viên</p>
              <button type="button" aria-label="Đóng hồ sơ" onClick={() => setProfileOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100"><X size={23} /></button>
            </div>
            <div className="p-4 sm:p-5"><EmployeeProfile employee={selected} /></div>
          </section>
        </div>
      )}
    </>
  );
}

function EmptyProfile() {
  return <aside className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-400 xl:sticky xl:top-24">Chọn một nhân viên để xem hồ sơ.</aside>;
}

export default function EmployeesPage() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#f7faf8]">
      <Navbar />
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Đang tải...</div>}><EmployeesContent /></Suspense>
      <Footer />
    </main>
  );
}
