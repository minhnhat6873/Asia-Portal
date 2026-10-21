"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <main className="relative isolate flex h-dvh items-center justify-center overflow-hidden bg-white px-5 py-4 text-[#103858] sm:px-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        <section aria-labelledby="not-found-title" className="order-2 w-full text-center">
          <p aria-hidden="true" className="text-[clamp(48px,12dvh,88px)] font-black leading-none tracking-tight text-emerald-700">404</p>
          <h1 id="not-found-title" className="mt-2 text-xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-2xl">Không tìm thấy trang này</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">Trang bạn đang tìm kiếm không tồn tại, đã bị di chuyển hoặc đường dẫn không chính xác.</p>
          <div className="mt-5 flex items-center justify-center">
            <button type="button" onClick={() => { if (window.history.length > 1) router.back(); else router.replace("/"); }} className="inline-flex min-h-11 min-w-40 items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 px-6 py-3 text-base font-bold text-white shadow-lg shadow-emerald-800/10 transition-colors hover:from-emerald-700 hover:to-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600"><ArrowLeft size={22} />Quay lại</button>
          </div>
        </section>

        <svg aria-hidden="true" viewBox="0 0 460 430" fill="none" className="order-1 mx-auto mb-2 h-[clamp(80px,28dvh,200px)] w-full max-w-[250px]">
          <defs>
            <linearGradient id="missing-paper" x1="140" y1="90" x2="320" y2="350" gradientUnits="userSpaceOnUse"><stop stopColor="white" /><stop offset="1" stopColor="#edf8f3" /></linearGradient>
            <linearGradient id="missing-green" x1="275" y1="210" x2="370" y2="345" gradientUnits="userSpaceOnUse"><stop stopColor="#62b4a5" /><stop offset="1" stopColor="#00836c" /></linearGradient>
          </defs>
          <path d="M121 315C43 229 100 107 180 52c95-65 113 73 124 134 12 64 71-75 121-6 52 72-47 195-140 191-53-2-114-1-164-56Z" fill="#e9f6ef" />
          <ellipse cx="242" cy="375" rx="200" ry="23" fill="#eff6fa" /><ellipse cx="245" cy="377" rx="141" ry="12" fill="#dcecf0" />
          <path d="M12 166c49-43 85-16 107 23s53 58 87 38" stroke="#98c7c6" strokeWidth="2" strokeDasharray="7 7" />
          <g>
            <path d="M156 89h121l49 48v215a14 14 0 0 1-14 14H156a14 14 0 0 1-14-14V103a14 14 0 0 1 14-14Z" fill="url(#missing-paper)" stroke="#539e90" strokeWidth="3" />
            <path d="m277 89 49 48h-35a14 14 0 0 1-14-14V89Z" fill="#559b94" />
            <ellipse cx="207" cy="176" rx="6" ry="7" fill="#7da7aa" /><ellipse cx="249" cy="176" rx="6" ry="7" fill="#7da7aa" />
            <path d="M211 210c10-12 23-12 34 0" stroke="#7da7aa" strokeWidth="7" strokeLinecap="round" />
            <path d="M179 259h104m-104 29h104m-104 29h49" stroke="#d9e9ed" strokeWidth="12" strokeLinecap="round" />
          </g>
          <circle cx="318" cy="280" r="48" fill="#a7ded5" fillOpacity=".6" stroke="url(#missing-green)" strokeWidth="12" />
          <path d="M318 260v23" stroke="#00836c" strokeWidth="11" strokeLinecap="round" /><circle cx="318" cy="301" r="6" fill="#00836c" />
          <path d="m329 117 3-22m16 35 23-22m-11 42 24-5" stroke="#00936c" strokeWidth="8" strokeLinecap="round" />
          <path d="M75 134c-29-7-31-29-21-45 9 15 31 20 21 45Zm10 199c-18-13-9-32 4-43 7 17 10 30-4 43Zm-5 3c-25 3-32-9-35-22 17 0 32 5 35 22Z" fill="#49ad87" />
        </svg>
      </div>
    </main>
  );
}
