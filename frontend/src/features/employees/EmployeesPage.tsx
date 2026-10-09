"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
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

const PAGE_LIMIT = 12;
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
    getPublicEmployees({ limit: 100, sort: "latest" }, controller.signal)
      .then((result) => setAllEmployees(result.items))
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "Không thể tải danh sách nhân viên");
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, []);

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

  const hasActiveFilters = Boolean(search.trim()) || department !== "Tất cả phòng ban" || position !== "Tất cả chức vụ";

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
                  onSelect={setSelected}
                  onOpenProfile={openMobileProfile}
                />
                {visiblePagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3">
                    <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">Trước</button>
                    <span className="text-sm text-slate-500">Trang {visiblePagination.page} / {visiblePagination.totalPages}</span>
                    <button type="button" disabled={page >= visiblePagination.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">Sau</button>
                  </div>
                )}
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
