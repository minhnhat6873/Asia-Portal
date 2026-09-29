"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Grid2X2, Mail, Phone, Search, Users, X } from "lucide-react";
import { getPublicEmployees } from "@/services/employee.service";
import type { Employee } from "@/types/employee";

const ALL_DEPARTMENTS = "Tất cả phòng ban";

export default function EmployeeSection() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState(ALL_DEPARTMENTS);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const departmentMenuRef = useRef<HTMLDivElement>(null);
  const departments = [ALL_DEPARTMENTS, ...Array.from(new Set(employees.map((employee) => employee.department))).sort()];
  const previewEmployees = employees.slice(0, 4);

  useEffect(() => {
    const controller = new AbortController();
    getPublicEmployees({ limit: 100, sort: "latest" }, controller.signal)
      .then((result) => setEmployees(result.items))
      .catch(() => setEmployees([]))
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!departmentOpen) return;
    const closeWhenClickOutside = (event: MouseEvent) => {
      if (!departmentMenuRef.current?.contains(event.target as Node)) setDepartmentOpen(false);
    };
    document.addEventListener("mousedown", closeWhenClickOutside);
    return () => document.removeEventListener("mousedown", closeWhenClickOutside);
  }, [departmentOpen]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (department !== ALL_DEPARTMENTS) params.set("department", department);
    router.push(params.size ? `/employees?${params}` : "/employees");
  };

  return (
    <section className="bg-white py-8 sm:py-10 xl:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-7 xl:flex-row xl:gap-12">
          <div className="flex max-w-md shrink-0 flex-col justify-between xl:w-64">
            <div>
              <p className="section-label mb-3">Con người Á Châu</p>
              <h2 className="text-3xl font-black leading-tight text-gray-900 sm:text-4xl">Gặp gỡ những thành viên của Á Châu</h2>
              <div className="my-6 h-1 w-10 rounded-full bg-[#1a7a1a]" />
              <p className="text-sm leading-relaxed text-gray-500">Mỗi cá nhân là một mảnh ghép quan trọng tạo nên hành trình phát triển của Á Châu.</p>
            </div>
            <Link href="/employees" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0d5c0d] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1a7a1a] sm:mt-7 sm:w-fit">Xem tất cả nhân viên <ArrowRight size={16} /></Link>
          </div>

          <div className="min-w-0 flex-1">
            <form onSubmit={handleSearch} className="mb-7 flex flex-col gap-4 xl:flex-row">
              <div className="relative flex min-w-0 flex-1 items-center rounded-full border border-green-100 bg-white p-1.5 shadow-[0_8px_28px_rgba(22,122,74,0.10)] focus-within:shadow-[0_10px_32px_rgba(22,122,74,0.18)]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-[#087d3e] sm:h-12 sm:w-12"><Search size={27} strokeWidth={2.5} /></div>
                <input type="search" placeholder="Tìm kiếm theo tên, phòng ban, chức vụ..." value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 border-0 bg-transparent px-2 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 sm:px-4 sm:text-base" />
                {search && <button type="button" onClick={() => setSearch("")} aria-label="Xóa từ khóa tìm kiếm" className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"><X size={17} /></button>}
                <button type="submit" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#087d3e] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#066c35] sm:gap-3 sm:px-6 sm:py-3.5 sm:text-base"><span>Tìm kiếm</span><ArrowRight size={21} strokeWidth={2.5} /></button>
              </div>

              <div ref={departmentMenuRef} className="relative w-full shrink-0 xl:w-auto">
                <button type="button" onClick={() => setDepartmentOpen((open) => !open)} className="flex w-full items-center gap-3 rounded-full border border-green-100 bg-[#fbfffc] px-5 py-3.5 text-sm hover:border-[#1a7a1a] sm:text-base xl:w-72"><Grid2X2 size={23} className="shrink-0 text-[#087d3e]" /><span className="flex-1 truncate text-left font-medium text-gray-700">{department}</span><ChevronDown size={19} className="shrink-0 text-gray-800" /></button>
                {departmentOpen && <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg">{departments.map((item) => <button type="button" key={item} onClick={() => { setDepartment(item); setDepartmentOpen(false); }} className={`w-full px-4 py-2.5 text-left text-sm hover:bg-green-50 hover:text-[#1a7a1a] ${department === item ? "bg-green-50 font-semibold text-[#1a7a1a]" : "text-gray-700"}`}>{item}</button>)}</div>}
              </div>
            </form>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {isLoading ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-slate-100" />) : previewEmployees.map((employee) => <EmployeeCard key={employee.id} employee={employee} />)}
            </div>
            {!isLoading && previewEmployees.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Chưa có nhân viên để hiển thị.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

function EmployeeCard({ employee }: { employee: Employee }) {
  return (
    <Link href={`/employees?search=${encodeURIComponent(employee.name)}`} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-green-50 sm:aspect-square"><Image src={employee.avatar || "/assets/images/default-avatar.png"} alt={`Chân dung ${employee.name}`} fill sizes="(min-width: 1280px) 220px, (min-width: 640px) 45vw, 100vw" className="object-cover object-center transition-transform duration-500 group-hover:scale-105" /></div>
      <div className="p-3 sm:p-4">
        <p className="text-xs font-bold leading-tight text-gray-900 sm:text-sm">{employee.name}</p>
        <p className="mt-1 min-h-0 text-[11px] leading-snug text-gray-500 sm:min-h-10 sm:text-xs">{employee.position}</p>
        <div className="mt-2 space-y-1 text-[11px] text-gray-500 sm:mt-3 sm:space-y-1.5 sm:text-xs"><p className="flex items-center gap-1.5"><Users size={12} className="shrink-0 text-[#1a7a1a]" />{employee.department}</p><p className="hidden items-center gap-1.5 sm:flex"><Mail size={12} className="shrink-0 text-[#1a7a1a]" /><span className="truncate">{employee.email}</span></p><p className="hidden items-center gap-1.5 sm:flex"><Phone size={12} className="shrink-0 text-[#1a7a1a]" />{employee.phone}</p></div>
      </div>
    </Link>
  );
}
