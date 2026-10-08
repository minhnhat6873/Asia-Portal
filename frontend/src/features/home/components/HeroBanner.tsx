import { Leaf } from "lucide-react";

export default function HeroBanner() {
  return (
    <section className="relative isolate min-h-[330px] overflow-hidden sm:min-h-[360px] xl:min-h-[500px]">
      <div
        className="absolute inset-0 bg-cover bg-left bg-no-repeat sm:bg-center"
        style={{ backgroundImage: "url('/assets/images/home-1.png')" }}
      />

      <div className="relative z-10 mx-auto flex min-h-[330px] w-full max-w-[1800px] items-start px-3 pt-4 sm:min-h-[360px] sm:px-8 sm:pt-6 lg:px-[4%] xl:min-h-[500px] xl:pt-8">
        <div className="w-fit max-w-full">
          <div className="mb-4 flex items-center justify-center gap-3 text-[#064d20] sm:mb-5">
            <p className="text-[8px] font-bold uppercase tracking-[0.32em] sm:text-[10px] xl:text-sm">
              Asia Internal Portal
            </p>
            <Leaf className="h-5 w-5 fill-[#279318] sm:h-7 sm:w-7" strokeWidth={1.5} />
            <span className="hidden h-px w-14 bg-[#28742c] sm:block" aria-hidden="true" />
          </div>

          <h1 className="uppercase leading-[0.95] tracking-[-0.045em] drop-shadow-[0_2px_1px_rgba(255,255,255,0.9)]">
            <span className="block text-[1.65rem] font-black text-[#08701c] sm:text-[clamp(2.25rem,4.3vw,4.8rem)]">
              Asia Food &amp;
            </span>
            <span className="mt-1 block text-[1.65rem] font-black text-[#ff9d00] sm:mt-2 sm:text-[clamp(2.25rem,4.3vw,4.8rem)]">
              Beverage
            </span>
          </h1>

          <p className="mx-auto mt-4 w-[78%] max-w-[570px] text-center text-[11px] font-medium leading-[1.35] text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)] sm:text-base xl:mt-5 xl:text-xl">
            Kết nối đội ngũ, cập nhật thông tin
            <br className="hidden sm:block" /> và cùng phát triển mỗi ngày.
          </p>
        </div>
      </div>
    </section>
  );
}
