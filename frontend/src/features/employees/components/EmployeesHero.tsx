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
      <div className="absolute inset-0 bg-gradient-to-r from-white/35 via-transparent to-transparent" />
      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6">
        <div className="flex w-full items-center justify-between gap-6">
          <div className="max-w-[min(100%,680px)]">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0d5c0d] sm:text-sm">Con người Á Châu</p>
            <h1 className="mb-3 text-2xl font-black leading-snug text-[#0d5c0d] sm:text-3xl xl:text-4xl">
              Cùng nhau tạo nên<br />
              <span className="text-[#f28c00]">những điều tuyệt vời</span>
            </h1>
            <p className="mb-4 max-w-xl text-sm font-semibold leading-relaxed text-black sm:text-base">
              Mỗi thành viên là một mảnh ghép quan trọng trong hành trình phát triển của Á Châu.
            </p>
            <div className="flex items-center gap-4 sm:gap-7">
              {highlights.map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon size={18} className="shrink-0 text-[#c45a00] sm:hidden" />
                  <Icon size={21} className="hidden shrink-0 text-[#c45a00] sm:block" />
                  <div>
                    <p className="text-base font-black leading-tight text-[#c45a00] sm:text-lg">{value}</p>
                    <p className="text-[11px] font-semibold text-[#c45a00] sm:text-xs">{label}</p>
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
