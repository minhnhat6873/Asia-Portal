import Link from "next/link";
import { ArrowRight, Building2, Megaphone, Toolbox, Users } from "lucide-react";

const links = [
  { href: "/employees", icon: Users, title: "Danh sách nhân viên", desc: "Tìm kiếm và kết nối với đồng nghiệp" },
  { href: "/news", icon: Megaphone, title: "Truyền thông nội bộ", desc: "Tin tức, sự kiện, hoạt động" },
  { href: "/about-wana#resources", icon: Toolbox, title: "Công cụ & tài nguyên", desc: "Các tiện ích nội bộ dành cho nhân viên" },
  { href: "/about-wana", icon: Building2, title: "Về Á Châu", desc: "Văn hóa, giá trị, tầm nhìn" },
];

export default function QuickLinks() {
  return (
    <section className="border-b border-gray-100 bg-white py-5 sm:py-6">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 sm:gap-4 sm:px-6 xl:grid-cols-4">
        {links.map(({ href, icon: Icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-w-0 items-center gap-2.5 rounded-xl border border-gray-100 bg-white p-3 sm:gap-4 sm:rounded-2xl sm:p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-100 hover:shadow-md"
          >
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-[#1a7a1a]">
              <Icon size={20} className="sm:hidden" />
              <Icon size={25} className="hidden sm:block" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold leading-tight text-gray-900 sm:text-base transition-colors group-hover:text-[#1a7a1a]">{title}</p>
              <p className="mt-1 hidden truncate text-xs text-gray-500 sm:block">{desc}</p>
            </div>
            <ArrowRight size={16} className="shrink-0 text-[#1a7a1a] transition-transform group-hover:translate-x-1 sm:hidden" />
            <ArrowRight size={18} className="hidden shrink-0 text-[#1a7a1a] transition-transform group-hover:translate-x-1 sm:block" />
          </Link>
        ))}
      </div>
    </section>
  );
}
