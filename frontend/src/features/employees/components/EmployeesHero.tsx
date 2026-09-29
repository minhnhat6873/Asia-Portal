import Image from "next/image";
import { Building2, LayoutGrid, Users } from "lucide-react";

const highlights = [
  { icon: Users, value: "500+", label: "Nhân viên" },
  { icon: Building2, value: "12+", label: "Phòng ban" },
  { icon: LayoutGrid, value: "3", label: "Văn phòng" },
];

export default function EmployeesHero() {
  return (
    <section className="relative h-56 overflow-hidden sm:h-64 xl:h-75">
      <Image
        src="/assets/images/employees-banner.png"
        alt="Đội ngũ Asia Food & Beverage"
        fill
        priority
        sizes="100vw"
        className="object-cover"
        style={{ objectPosition: "70% center" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0d5c0d_0%,#0d5c0d_25%,rgba(13,92,13,0.85)_35%,rgba(13,92,13,0.5)_50%,rgba(13,92,13,0.15)_65%,transparent_80%)]" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6">
        <div className="flex w-full items-center justify-between gap-6">
          <div className="max-w-md">
            <p className="mb-1 text-[9px] sm:mb-2 sm:text-[10px] font-bold uppercase tracking-[0.2em] text-[#f5c800]">Con người Á Châu</p>
            <h1 className="mb-2 text-xl font-black leading-snug text-white sm:text-2xl xl:text-3xl">
              Cùng nhau tạo nên<br />
              <span className="text-[#f5c800]">những điều tuyệt vời</span>
            </h1>
            <p className="mb-3 max-w-xs text-[11px] leading-relaxed text-white/80 sm:mb-4 sm:max-w-sm sm:text-xs">
              Mỗi thành viên là một mảnh ghép quan trọng trong hành trình phát triển của Á Châu.
            </p>
            <div className="flex items-center gap-3 sm:gap-5">
              {highlights.map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon size={14} className="shrink-0 text-[#f5c800] sm:hidden" />
                  <Icon size={16} className="hidden shrink-0 text-[#f5c800] sm:block" />
                  <div>
                    <p className="text-xs font-black leading-none text-white sm:text-sm">{value}</p>
                    <p className="text-[9px] text-white/55 sm:text-[10px]">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden max-w-40 rounded-xl border border-white/15 bg-[#0d5c0d]/60 px-4 py-3 text-center backdrop-blur-sm lg:block">
            <p className="text-xs leading-snug text-white">Con người là trái tim của Á Châu</p>
            <div className="mx-auto mt-2 h-0.5 w-6 rounded-full bg-[#f5c800]" />
          </div>
        </div>
      </div>
    </section>
  );
}
