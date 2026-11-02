import Image from "next/image";

export default function EmployeesHero() {
  return (
    <section className="relative h-auto min-h-[280px] w-full overflow-hidden py-5 sm:h-64 sm:min-h-0 sm:py-0 xl:h-75">
      <Image
        src="/assets/images/employees-banner.png"
        alt="Đội ngũ Asia Food & Beverage co.ltd"
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
            <p className="box-border w-full min-w-0 max-w-full break-words text-xs font-semibold leading-relaxed text-black sm:max-w-xl sm:text-base">
              Mỗi thành viên là một mảnh ghép
              <br className="hidden min-[769px]:block" />
              <br className="min-[769px]:hidden" /> quan trọng trong hành trình
              <br className="min-[769px]:hidden" /> phát triển của Á Châu.
            </p>

          </div>

        </div>
      </div>
    </section>
  );
}
