import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AccessDenied({ returnHref }: { returnHref: string }) {
  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-[#f8fcfb] px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-52 -top-72 h-[580px] w-[580px] rounded-full border-[95px] border-emerald-100/25 bg-emerald-100/40 shadow-[0_0_0_100px_rgba(209,250,229,0.12)]" />
        <div className="absolute -bottom-80 -left-80 h-[640px] w-[640px] rounded-full border-[85px] border-emerald-100/30 bg-emerald-100/50 shadow-[0_0_0_90px_rgba(209,250,229,0.18),0_0_0_180px_rgba(209,250,229,0.10)]" />
        <span className="absolute left-[8%] top-[42%] h-4 w-4 rounded-full bg-emerald-100/70" />
        <span className="absolute bottom-[19%] left-[18%] h-3 w-3 rounded-full bg-emerald-200/50" />
        <span className="absolute right-[10%] top-[22%] h-3 w-3 rounded-full bg-emerald-200/50" />
        <div className="absolute right-0 top-1/4 h-28 w-20 opacity-40 [background-image:radial-gradient(#b9e8d9_2px,transparent_2px)] [background-size:18px_18px]" />
      </div>

      <section aria-labelledby="access-denied-title" className="w-full max-w-[780px] rounded-2xl border border-white bg-white/95 px-5 py-10 text-center shadow-[0_16px_65px_rgba(15,74,60,0.10)] sm:px-12 sm:py-12">
        <svg aria-hidden="true" viewBox="0 0 320 200" className="mx-auto mb-5 h-40 w-full max-w-80 sm:h-48" fill="none">
          <defs>
            <linearGradient id="denied-lock" x1="120" y1="70" x2="200" y2="165" gradientUnits="userSpaceOnUse"><stop stopColor="#009c75" /><stop offset="1" stopColor="#00725a" /></linearGradient>
            <linearGradient id="denied-circle" x1="75" y1="20" x2="245" y2="180" gradientUnits="userSpaceOnUse"><stop stopColor="#effbf6" /><stop offset="1" stopColor="#dff5ed" /></linearGradient>
          </defs>
          <path d="M20 99h54m-37-9h37m163-10h34M60 156h43m121 0h49" stroke="#eaf8f3" strokeWidth="23" strokeLinecap="round" />
          <circle cx="160" cy="100" r="94" fill="url(#denied-circle)" />
          <circle cx="279" cy="105" r="7" fill="#dff5ed" /><circle cx="246" cy="76" r="5" fill="#dff5ed" />
          <path d="M135 91V70a25 25 0 0 1 50 0v21" stroke="url(#denied-lock)" strokeWidth="11" />
          <rect x="116" y="90" width="88" height="75" rx="10" fill="url(#denied-lock)" />
          <path d="m149 115 22 22m0-22-22 22" stroke="white" strokeWidth="8" strokeLinecap="round" />
          <path d="m210 73 8-11m1 23 12-4" stroke="#00866a" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <h1 id="access-denied-title" className="text-2xl font-bold leading-snug tracking-tight text-slate-900 sm:text-[28px]">Bạn chưa được cấp quyền truy cập trang này</h1>
        <p className="mt-4 text-base leading-7 text-slate-500 sm:text-lg">Tài khoản của bạn hiện không có quyền truy cập vào nội dung này.<br className="hidden sm:block" /> Vui lòng quay lại để tiếp tục.</p>
        <Link href={returnHref} className="mx-auto mt-8 inline-flex min-h-12 min-w-48 items-center justify-center gap-4 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 px-7 py-3 text-base font-bold text-white shadow-lg shadow-emerald-800/10 transition-colors hover:from-emerald-700 hover:to-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600">
          <ArrowLeft size={23} aria-hidden="true" /> Quay lại
        </Link>
      </section>
    </main>
  );
}
