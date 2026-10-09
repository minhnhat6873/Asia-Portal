"use client";

import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import DiagramBreadcrumb from "./components/DiagramBreadcrumb";
import OrganizationChart from "./components/OrganizationChart";

export default function DiagramPage() {
  return (
    <main className="min-h-screen bg-white text-slate-800">
      <Navbar />

      <section className="relative h-56 overflow-hidden border-b border-slate-100 bg-white sm:h-64 xl:h-75">
        <Image
          src="/assets/images/banner-diagram.png"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-white/35 via-white/15 to-transparent [background-size:35%_100%] [background-repeat:no-repeat]" />
        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-5 py-10 sm:px-8 lg:px-10">
          <p className="w-full max-w-[560px] self-start text-xs font-extrabold uppercase tracking-[0.08em] text-[#0d5c0d] sm:text-sm">Sơ đồ tổ chức</p>
          <div className="mt-2 max-w-[480px]">
            <div>
              <h1 className="max-w-[560px] text-[30px] font-black leading-[1.12] tracking-tight text-[#0d5c0d] sm:text-[38px] lg:text-[44px]">
                Cùng nhìn tổng thể <span className="block text-[#f28c00]">tổ chức Á Châu</span>
              </h1>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto w-full max-w-7xl px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <div className="mb-7">
          <DiagramBreadcrumb current="Sơ đồ tổ chức" />
        </div>
        <OrganizationChart />
      </section>
      <Footer />
    </main>
  );
}
