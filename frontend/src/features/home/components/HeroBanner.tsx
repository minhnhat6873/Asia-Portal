import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HeroBanner() {
  return (
    <section className="relative isolate min-h-[330px] overflow-hidden sm:min-h-[360px] xl:min-h-[500px]">
      <div
        className="absolute inset-0 bg-cover bg-[position:60%_center] sm:bg-center"
        style={{ backgroundImage: "url('/assets/images/home-1.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[330px] max-w-7xl items-center px-4 sm:min-h-[360px] sm:px-6 xl:min-h-[500px]">
        <div className="max-w-xl text-white">
          <p className="mb-2 text-[10px] sm:mb-3 sm:text-xs font-bold uppercase tracking-[0.35em] text-[#f5c800]">
            Asia Internal Portal
          </p>
          <h1 className="text-3xl font-black leading-tight drop-shadow-lg sm:text-4xl xl:text-6xl">
            Asia Food &amp; Beverage
          </h1>
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-white/90 sm:mt-4 sm:max-w-md sm:text-sm xl:text-base">
            Kết nối đội ngũ, cập nhật thông tin và cùng phát triển mỗi ngày.
          </p>
          <Link
            href="/employees"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#c8e63a] px-5 py-2.5 text-xs sm:mt-7 sm:px-7 sm:py-3 sm:text-sm font-semibold text-[#1a1a1a] shadow-md transition-colors hover:bg-[#b5d42a]"
          >
            Khám phá ngay <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
