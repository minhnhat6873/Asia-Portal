"use client";

import Image from "next/image";
import Navbar from "@/app/components/layout/Navbar";
import Footer from "@/app/components/layout/Footer";
import DiagramBreadcrumb from "@/app/components/ui/DiagramBreadcrumb";
import OrganizationChart from "./OrganizationChart";
import DepartmentOrganizationChart from "./DepartmentOrganizationChart";
import { useState } from "react";

export default function DiagramPage() {
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-white text-slate-800">
      <Navbar />

      <section className="relative min-h-[290px] overflow-hidden border-b border-slate-100 bg-white">
        <Image
          src="/assets/images/banner-diagram.png"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="relative mx-auto flex min-h-[290px] max-w-7xl flex-col justify-center px-5 py-10 sm:px-8 lg:px-10">
          <p className="w-full max-w-[480px] self-start rounded-t-2xl bg-[#073b20]/82 px-5 pt-5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-emerald-200 backdrop-blur-sm">Sơ đồ tổ chức</p>
          <div className="mt-0 max-w-[480px] rounded-b-2xl bg-[#073b20]/82 px-5 pb-5 shadow-xl shadow-emerald-950/20 backdrop-blur-sm">
            <div>
              <h1 className="max-w-[430px] text-[24px] font-black leading-[1.12] tracking-tight text-white sm:text-[28px]">
                Cùng nhìn tổng thể <span className="block text-[#9cf5a8]">tổ chức Á Châu</span>
              </h1>
              <p className="mt-3 max-w-[430px] text-[13px] leading-5 text-white/90">
                Kết nối con người, vận hành hiệu quả và xây dựng một tổ chức vững mạnh hôm nay.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto w-full max-w-7xl px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <div className="mb-7">
          <DiagramBreadcrumb current={selectedDepartment ? "Phòng Truyền thông" : "Sơ đồ tổ chức"} />
        </div>
        {selectedDepartment === "truyen-thong" ? (
          <DepartmentOrganizationChart onBack={() => setSelectedDepartment(null)} />
        ) : (
          <OrganizationChart onDepartmentSelect={setSelectedDepartment} />
        )}
      </section>
      <Footer />
    </main>
  );
}
