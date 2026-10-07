"use client";

import Image from "next/image";
import Link from "next/link";
import { Building2, ChevronLeft, Circle, MapPin, RefreshCw, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import DiagramBreadcrumb from "./components/DiagramBreadcrumb";
import { getPublicEmployees } from "@/services/employee.service";
import type { Employee, EmployeePagination } from "@/types/employee";
import { getEmployeeAvatar } from "@/features/employees/utils/employeeUtils";
import { sortEmployeesByRank } from "@/config/employeeRanks";
import { getEmployeeDepartmentLabel } from "@/components/ui/employee-department-options";

const PAGE_LIMIT = 12;

const emptyPagination: EmployeePagination = {
  page: 1,
  limit: PAGE_LIMIT,
  total: 0,
  totalPages: 0,
};

const NO_EMPLOYEE_DEPARTMENTS: string[] = [];

type DepartmentDiagramPageProps = {
  department: string;
  employeeDepartments?: string[];
};

function EmployeeCard({ employee }: { employee: Employee }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_10px_28px_rgba(15,118,65,0.08)]">
      <div className="relative aspect-[4/3] bg-emerald-50">
        <Image
          src={getEmployeeAvatar(employee)}
          alt={`Chân dung ${employee.name}`}
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
          className="object-cover object-top transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform group-hover:-translate-y-2 group-hover:scale-105"
        />
      </div>
      <div className="flex min-h-[144px] gap-3 bg-emerald-50 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-extrabold leading-tight text-[#0d5c0d]">{employee.name}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-700">{employee.position}</p>
            </div>
          </div>
          <div className="mt-3 space-y-1 text-xs font-medium text-slate-600">
            <p className="flex items-center gap-1.5"><Building2 size={14} className="shrink-0 text-[#1a7a1a]" />{getEmployeeDepartmentLabel(employee.department)}</p>
            <p className="flex items-center gap-1.5"><MapPin size={14} className="shrink-0 text-[#1a7a1a]" />{employee.location}</p>
            <p className="flex items-center gap-1.5 font-semibold text-[#16883b]"><Circle size={9} fill="currentColor" className="shrink-0" />Đang làm việc</p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function DepartmentDiagramPage({ department, employeeDepartments }: DepartmentDiagramPageProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState<EmployeePagination>(emptyPagination);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const retry = () => {
    setIsLoading(true);
    setError("");
    setReloadKey((current) => current + 1);
  };

  const changePage = (nextPage: number) => {
    setIsLoading(true);
    setError("");
    setPage(nextPage);
  };

  useEffect(() => {
    const controller = new AbortController();

    const loadEmployees = async () => {
      try {
        const filterDepartments = [...new Set(employeeDepartments ?? NO_EMPLOYEE_DEPARTMENTS)];

        if (filterDepartments.length === 0) {
          setEmployees([]);
          setPagination(emptyPagination);
          setError("");
          return;
        }

        const firstPages = await Promise.all(
          filterDepartments.map((employeeDepartment) =>
            getPublicEmployees(
              { department: employeeDepartment, page: 1, limit: 100, sort: "latest" },
              controller.signal,
            ),
          ),
        );
        const remainingPages = await Promise.all(
          firstPages.flatMap((result, index) =>
            Array.from(
              { length: Math.max(result.pagination.totalPages - 1, 0) },
              (_, offset) =>
                getPublicEmployees(
                  {
                    department: filterDepartments[index],
                    page: offset + 2,
                    limit: 100,
                    sort: "latest",
                  },
                  controller.signal,
                ),
            ),
          ),
        );
        const allEmployees = sortEmployeesByRank(
          [...firstPages, ...remainingPages].flatMap((result) => result.items),
        );
        const total = allEmployees.length;
        const totalPages = Math.ceil(total / PAGE_LIMIT);
        const start = (page - 1) * PAGE_LIMIT;

        setEmployees(allEmployees.slice(start, start + PAGE_LIMIT));
        setPagination({ page, limit: PAGE_LIMIT, total, totalPages });
        setError("");
      } catch (requestError: unknown) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setEmployees([]);
        setPagination(emptyPagination);
        setError(requestError instanceof Error ? requestError.message : "Không thể tải danh sách nhân viên");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadEmployees();

    return () => controller.abort();
  }, [employeeDepartments, page, reloadKey]);

  return (
    <main className="min-h-screen bg-[#fbfefc] text-slate-800">
      <Navbar />

      <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <DiagramBreadcrumb current={department} />

        <header className="mt-7 flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-white px-5 py-5 shadow-[0_10px_28px_rgba(15,118,65,0.08)] sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#16883b]">
              <UsersRound size={23} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#1a7a1a]">Phòng ban</p>
              <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{department}</h1>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-[#16883b]">
            <UsersRound size={16} /> {isLoading ? "Đang tải..." : `${pagination.total} nhân sự`}
          </span>
        </header>

        <div className="mt-7">
          {error ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-14 text-center text-sm text-rose-700">
              <p>{error}</p>
              <button type="button" onClick={retry} className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-bold text-rose-700 shadow-sm transition-colors hover:bg-rose-100">
                <RefreshCw size={15} /> Thử lại
              </button>
            </div>
          ) : isLoading ? (
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-7 sm:grid-cols-2 lg:gap-8 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-2xl border border-emerald-50 bg-white">
                  <div className="aspect-[4/3] animate-pulse bg-emerald-50" />
                  <div className="h-28 animate-pulse bg-emerald-100/60" />
                </div>
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-white px-5 py-16 text-center text-sm text-slate-500">
              Chưa có nhân viên trong phòng ban này.
            </div>
          ) : (
            <>
              <div className="mx-auto grid max-w-6xl grid-cols-1 gap-7 sm:grid-cols-2 lg:gap-8 lg:grid-cols-3">
                {employees.map((employee) => <EmployeeCard key={employee.id} employee={employee} />)}
              </div>
              {pagination.totalPages > 1 ? (
                <div className="mt-8 flex items-center justify-center gap-3">
                  <button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)} className="rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-[#0d5c0d] transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40">Trước</button>
                  <span className="text-sm text-slate-500">Trang {pagination.page} / {pagination.totalPages}</span>
                  <button type="button" disabled={page >= pagination.totalPages} onClick={() => changePage(page + 1)} className="rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-[#0d5c0d] transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40">Sau</button>
                </div>
              ) : null}
            </>
          )}
        </div>

        <Link href="/diagram" className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-sm font-bold text-[#16883b] transition-colors hover:bg-emerald-50">
          <ChevronLeft size={16} /> Quay lại sơ đồ tổ chức
        </Link>
      </section>

      <Footer />
    </main>
  );
}
