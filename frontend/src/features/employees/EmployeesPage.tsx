"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
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

const PAGE_LIMIT = 10;
function EmployeesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [department, setDepartment] = useState(() => searchParams.get("department") ?? "Tất cả phòng ban");
  const [position, setPosition] = useState(() => searchParams.get("position") ?? "Tất cả chức vụ");
  const [newestFirst, setNewestFirst] = useState(() => searchParams.get("sort") !== "oldest");
  const [page, setPage] = useState(() => Math.max(Number(searchParams.get("page")) || 1, 1));
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredEmployees = useMemo(() => {
    const query = normalizeSearchText(search);
    return allEmployees
      .filter((employee) => {
        const matchesSearch = !query || normalizeSearchText(`${employee.employeeCode} ${employee.name}`).includes(query);
        const matchesDepartment = department === "Tất cả phòng ban" || employee.department === department;
        const matchesPosition = position === "Tất cả chức vụ" || employee.position === position;
        return matchesSearch && matchesDepartment && matchesPosition;
      })
      .sort((left, right) => {
        const dateDifference = new Date(left.joinDate).getTime() - new Date(right.joinDate).getTime();
        return newestFirst ? -dateDifference : dateDifference;
      });
  }, [allEmployees, department, newestFirst, position, search]);

  const pageCount = Math.ceil(filteredEmployees.length / PAGE_LIMIT);
  const visibleEmployees = filteredEmployees.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);
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

  const departments = useMemo(
    () => ["Tất cả phòng ban", ...Array.from(new Set(allEmployees.map((employee) => employee.department))).sort()],
    [allEmployees],
  );
  const positions = useMemo(
    () => ["Tất cả chức vụ", ...Array.from(new Set(allEmployees.map((employee) => employee.position))).sort()],
    [allEmployees],
  );

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
    if (pageCount > 0 && page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  useEffect(() => {
    setSelected((current) => visibleEmployees.find((employee) => employee.id === current?.id) ?? visibleEmployees[0] ?? null);
  }, [visibleEmployees]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (department !== "Tất cả phòng ban") params.set("department", department);
    if (position !== "Tất cả chức vụ") params.set("position", position);
    if (!newestFirst) params.set("sort", "oldest");
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    router.replace(query ? `/employees?${query}` : "/employees", { scroll: false });
  }, [department, newestFirst, page, position, router, search]);

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

  const hasActiveFilters = Boolean(search.trim()) || department !== "Tất cả phòng ban" || position !== "Tất cả chức vụ";
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
          position={position}
          departments={departments}
          positions={positions}
          newestFirst={newestFirst}
          onSearchChange={resetPage(setSearch)}
          onDepartmentChange={resetPage(setDepartment)}
          onPositionChange={resetPage(setPosition)}
          onToggleSort={() => {
            setNewestFirst((current) => !current);
            setPage(1);
          }}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => {
            setSearch("");
            setDepartment("Tất cả phòng ban");
            setPosition("Tất cả chức vụ");
            setPage(1);
          }}
        />
        <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4 sm:space-y-5">
            <EmployeeStats total={visiblePagination.total} departments={Math.max(departments.length - 1, 0)} positions={Math.max(positions.length - 1, 0)} />
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
                  total={visiblePagination.total}
                  page={visiblePagination.page}
                  limit={visiblePagination.limit}
                  pagination={employeePagination}
                  onSelect={setSelected}
                  onOpenProfile={openMobileProfile}
                />
              </>
            )}
          </div>
          <div className="hidden xl:block">{selected ? <EmployeeProfile employee={selected} /> : <EmptyProfile />}</div>
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
