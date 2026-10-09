import Image from "next/image";
import { Building2, LayoutGrid, Users } from "lucide-react";

const highlights = [
  { icon: Users, value: "500+", label: "Nhân viên" },
  { icon: Building2, value: "12+", label: "Phòng ban" },
  { icon: LayoutGrid, value: "3", label: "Văn phòng" },
];

export default function EmployeesHero() {
  return (
    <section className="relative h-auto min-h-[280px] w-full overflow-hidden py-5 sm:h-64 sm:min-h-0 sm:py-0 xl:h-75">
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
      <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl items-center px-4 sm:px-6">
        <div className="flex min-w-0 w-full items-center justify-between gap-6">
          <div className="w-full min-w-0 max-w-full sm:max-w-[680px]">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0d5c0d] sm:text-sm">Con người Á Châu</p>
            <h1 className="mb-2 text-[22px] font-black leading-tight text-[#0d5c0d] sm:mb-3 sm:text-3xl sm:leading-snug xl:text-4xl">
              Cùng nhau tạo nên<br />
              <span className="text-[#f28c00]">những điều tuyệt vời</span>
            </h1>
            <p className="mb-3 box-border w-full min-w-0 max-w-full break-words text-xs font-semibold leading-relaxed text-black sm:mb-4 sm:max-w-xl sm:text-base">
              Mỗi thành viên là một mảnh ghép
              <br className="hidden min-[769px]:block" />
              <br className="min-[769px]:hidden" /> quan trọng trong hành trình
              <br className="min-[769px]:hidden" /> phát triển của Á Châu.
            </p>
            <div className="grid w-full max-w-full grid-cols-3 items-start gap-1 sm:flex sm:items-center sm:gap-7">
              {highlights.map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex w-full min-w-0 flex-col items-center gap-0.5 rounded-xl bg-gradient-to-b from-white/65 to-white/20 px-1.5 py-1 text-center shadow-[0_1px_5px_rgba(255,255,255,0.25)] sm:w-auto sm:flex-row sm:items-center sm:gap-2 sm:rounded-none sm:bg-none sm:px-0 sm:py-0 sm:text-left sm:shadow-none">
                  <Icon size={16} className="shrink-0 text-[#7c2d12] sm:hidden" />
                  <Icon size={21} className="hidden shrink-0 text-[#7c2d12] sm:block" />
                  <div className="min-w-0">
                    <p className="text-sm font-black leading-tight text-[#7c2d12] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] sm:text-lg">{value}</p>
                    <p className="max-w-full truncate text-[9px] font-semibold text-[#7c2d12] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] sm:text-xs">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
