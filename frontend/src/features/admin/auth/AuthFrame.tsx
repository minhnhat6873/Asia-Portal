import { AmbientBackground } from "./AuthElements";
export default function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col justify-between selection:bg-[#f5c800] selection:text-black">
      <AmbientBackground />
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </div>
      <footer className="mx-auto w-full max-w-5xl border-t border-white/10 px-4 py-6 text-xs text-zinc-500">
        <div className="flex items-center justify-center gap-2 text-center">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#f5c800]" />
          <span>
            Asia Internal Portal • Hệ thống xác thực nội bộ Asia Food &amp;
            Beverage co.ltd
          </span>
        </div>
      </footer>
    </main>
  );
}
