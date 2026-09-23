"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/app/components/layout/Navbar";
import Footer from "@/app/components/layout/Footer";
import { getPublicEmployees } from "@/services/employee.service";
import type { Employee, EmployeePagination } from "@/types/employee";
import EmployeeDirectory from "./EmployeeDirectory";
import EmployeeFilters from "./EmployeeFilters";
import EmployeeProfile from "./EmployeeProfile";
import EmployeeStats from "./EmployeeStats";
import EmployeesHero from "./EmployeesHero";

const PAGE_LIMIT = 12;
const emptyPagination: EmployeePagination = {
  page: 1,
  limit: PAGE_LIMIT,
  total: 0,
  totalPages: 0,
};

function EmployeesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [department, setDepartment] = useState(() => searchParams.get("department") ?? "Tất cả phòng ban");
  const [position, setPosition] = useState(() => searchParams.get("position") ?? "Tất cả chức vụ");
  const [newestFirst, setNewestFirst] = useState(() => searchParams.get("sort") !== "oldest");
  const [page, setPage] = useState(() => Math.max(Number(searchParams.get("page")) || 1, 1));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState<EmployeePagination>(emptyPagination);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

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
      .catch(() => setAllEmployees([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setError("");
      getPublicEmployees({
        search: search.trim() || undefined,
        department: department === "Tất cả phòng ban" ? undefined : department,
        position: position === "Tất cả chức vụ" ? undefined : position,
        sort: newestFirst ? "latest" : "oldest",
        page,
        limit: PAGE_LIMIT,
      }, controller.signal)
        .then((result) => {
          setEmployees(result.items);
          setPagination(result.pagination);
          setSelected((current) => result.items.find((employee) => employee.id === current?.id) ?? result.items[0] ?? null);
        })
        .catch((requestError: unknown) => {
          if (requestError instanceof DOMException && requestError.name === "AbortError") return;
          setEmployees([]);
          setPagination(emptyPagination);
          setSelected(null);
          setError(requestError instanceof Error ? requestError.message : "Không thể tải danh sách nhân viên");
        })
        .finally(() => setIsLoading(false));
    }, search ? 300 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, department, position, newestFirst, page, reloadKey]);

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
      <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-7">
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
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4 sm:space-y-5">
            <EmployeeStats total={pagination.total} departments={Math.max(departments.length - 1, 0)} positions={Math.max(positions.length - 1, 0)} />
            {error ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-5 py-12 text-center text-sm text-rose-700">
                <p>{error}</p>
                <button type="button" onClick={() => setReloadKey((current) => current + 1)} className="mt-3 font-bold underline">Thử lại</button>
              </div>
            ) : isLoading ? (
              <div className="rounded-xl border border-slate-100 bg-white py-20 text-center text-sm text-slate-400">Đang tải danh sách nhân viên...</div>
            ) : (
              <>
                <EmployeeDirectory
                  employees={employees}
                  selectedId={selected?.id}
                  total={pagination.total}
                  page={pagination.page}
                  limit={pagination.limit}
                  onSelect={setSelected}
                  onOpenProfile={openMobileProfile}
                />
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3">
                    <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">Trước</button>
                    <span className="text-sm text-slate-500">Trang {pagination.page} / {pagination.totalPages}</span>
                    <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">Sau</button>
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
    <main className="min-h-screen bg-[#f7faf8]">
      <Navbar />
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Đang tải...</div>}><EmployeesContent /></Suspense>
      <Footer />
    </main>
  );
}
