import Link from "next/link";
import { ChevronRight, House } from "lucide-react";

type DiagramBreadcrumbProps = {
  current: string;
};

export default function DiagramBreadcrumb({ current }: DiagramBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2.5 text-[15px] font-medium text-slate-600 sm:text-base">
      <Link href="/" className="inline-flex items-center gap-1.5 transition-colors hover:text-[#16883b]">
        <House size={17} className="text-slate-500" />
        Trang chủ
      </Link>
      <ChevronRight size={18} className="text-slate-300" />
      {current === "Sơ đồ tổ chức" ? (
        <span className="font-extrabold text-slate-800">Sơ đồ tổ chức</span>
      ) : (
        <>
          <Link href="/diagram" className="transition-colors hover:text-[#16883b]">Sơ đồ tổ chức</Link>
          <ChevronRight size={18} className="text-slate-300" />
          <span className="font-extrabold text-slate-800">{current}</span>
        </>
      )}
    </nav>
  );
}
