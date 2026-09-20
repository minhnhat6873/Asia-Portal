"use client";

import { Suspense, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/app/components/layout/Navbar";
import Footer from "@/app/components/layout/Footer";
import { departments, employees } from "@/config/employees";
import EmployeeDirectory from "./EmployeeDirectory";
import EmployeeFilters from "./EmployeeFilters";
import EmployeeProfile from "./EmployeeProfile";
import EmployeeStats from "./EmployeeStats";
import EmployeesHero from "./EmployeesHero";

const allDepartments = departments;
const allPositions = ["Tất cả chức vụ", ...Array.from(new Set(employees.map((employee) => employee.position)))];

function EmployeesContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [department, setDepartment] = useState(() => {
    const fromUrl = searchParams.get("department");
    return fromUrl && allDepartments.includes(fromUrl) ? fromUrl : "Tất cả phòng ban";
  });
  const [position, setPosition] = useState("Tất cả chức vụ");
  const [newestFirst, setNewestFirst] = useState(true);
  const [selected, setSelected] = useState(employees[0]);
  const [profileOpen, setProfileOpen] = useState(false);

  const openMobileProfile = () => {
    if (window.matchMedia("(max-width: 1199px)").matches) setProfileOpen(true);
  };

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesKeyword = !keyword || [employee.name, employee.email, employee.department, employee.position, employee.phone]
        .some((value) => value.toLowerCase().includes(keyword));
      const matchesDepartment = department === "Tất cả phòng ban" || employee.department === department;
      const matchesPosition = position === "Tất cả chức vụ" || employee.position === position;
      return matchesKeyword && matchesDepartment && matchesPosition;
    }).sort((first, second) => {
      const toTimestamp = (date: string) => {
        const [day, month, year] = date.split("/").map(Number);
        return Date.UTC(year, month - 1, day);
      };
      const difference = toTimestamp(second.joinDate) - toTimestamp(first.joinDate);
      return newestFirst ? difference : -difference;
    });
  }, [search, department, position, newestFirst]);

  return (
    <>
      <EmployeesHero />
      <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-7">
        <EmployeeFilters
          search={search}
          department={department}
          position={position}
          departments={allDepartments}
          positions={allPositions}
          newestFirst={newestFirst}
          onSearchChange={setSearch}
          onDepartmentChange={setDepartment}
          onPositionChange={setPosition}
          onToggleSort={() => setNewestFirst((current) => !current)}
          hasActiveFilters={Boolean(search.trim()) || department !== "Tất cả phòng ban" || position !== "Tất cả chức vụ"}
          onClearFilters={() => {
            setSearch("");
            setDepartment("Tất cả phòng ban");
            setPosition("Tất cả chức vụ");
          }}
        />
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4 sm:space-y-5">
            <EmployeeStats />
            <EmployeeDirectory
              employees={filteredEmployees}
              selectedId={selected.id}
              onSelect={setSelected}
              onOpenProfile={openMobileProfile}
            />
          </div>
          <div className="hidden xl:block"><EmployeeProfile employee={selected} /></div>
        </div>
      </div>

      {profileOpen && (
        <div className="fixed inset-0 z-[60] xl:hidden" role="dialog" aria-modal="true" aria-label="Hồ sơ nhân viên">
          <button type="button" aria-label="Đóng hồ sơ" onClick={() => setProfileOpen(false)} className="absolute inset-0 bg-slate-950/45" />
          <section className="relative ml-auto flex h-full w-full max-w-md flex-col overflow-y-auto bg-[#f7faf8] shadow-[-12px_0_32px_rgba(15,23,42,0.2)]">
            <div className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4">
              <p className="text-base font-bold text-slate-800">Hồ sơ nhân viên</p>
              <button type="button" aria-label="Đóng hồ sơ" onClick={() => setProfileOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100">
                <X size={23} />
              </button>
            </div>
            <div className="p-4 sm:p-5"><EmployeeProfile employee={selected} /></div>
          </section>
        </div>
      )}
    </>
  );
}

export default function EmployeesPage() {
  return (
    <main className="min-h-screen bg-[#f7faf8]">
      <Navbar />
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Đang tải...</div>}>
        <EmployeesContent />
      </Suspense>
      <Footer />
    </main>
  );
}