"use client";

import Link from "next/link";
import { Be_Vietnam_Pro } from "next/font/google";
import { ArrowRight, CalendarCheck, CalendarDays, CarFront, Toolbox } from "lucide-react";
import { useUserSession } from "@/lib/userSession";
import { loginHref } from "@/lib/safeRedirect";

const quickLinksFont = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600"],
  display: "swap",
});

// requiresLogin: always shown, but a guest is sent to sign in first.
// loginReturn: where to come back to after signing in.
const links = [
  { href: "/meeting", icon: CalendarDays, title: "Đặt phòng họp", desc: "Đặt phòng và theo dõi lịch họp" },
  { href: "https://request.base.vn/requests", icon: CalendarCheck, title: "Đăng ký nghỉ phép", desc: "Gửi và theo dõi yêu cầu nghỉ phép.", external: true, requiresLogin: true, loginReturn: "/" },
  { href: "#resources", icon: Toolbox, title: "Công cụ & tài nguyên", desc: "Các tiện ích nội bộ dành cho nhân viên", requiresLogin: true, loginReturn: "/#resources" },
  { href: "/vehicles", icon: CarFront, title: "Đặt xe", desc: "Đón/đưa khách và giao nhận hàng." },
];

export default function QuickLinks() {
  const signedIn = useUserSession().status === "user";
  return (
    <section className={`${quickLinksFont.className} bg-white py-6 sm:py-8`}>
      <div className="mx-auto grid max-w-[1536px] grid-cols-1 gap-3 px-4 min-[560px]:grid-cols-2 sm:px-6 xl:grid-cols-4">
        {links.map(({ href, icon: Icon, title, desc, external, requiresLogin, loginReturn }) => {
          const needsLogin = Boolean(requiresLogin && !signedIn);
          const opensNewTab = external && !needsLogin;
          return (
            <Link
              key={title}
              href={needsLogin ? loginHref(loginReturn ?? "/") : href}
              target={opensNewTab ? "_blank" : undefined}
              rel={opensNewTab ? "noopener noreferrer" : undefined}
              title={needsLogin ? "Đăng nhập để sử dụng" : undefined}
              className="group flex min-h-[120px] min-w-0 items-center gap-3 rounded-[22px] border-[1.5px] border-[#e0e6e2] bg-white px-5 py-5 shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition-[background-color,border-color,box-shadow] duration-200 hover:border-[#16821b] hover:bg-[#eefbed] hover:shadow-[0_6px_16px_rgba(22,101,52,0.16)] focus-visible:border-[#16821b] focus-visible:bg-[#eefbed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16821b]"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#ecf9ee] text-[#16821b] transition-colors duration-200 group-hover:bg-[#1f8f2a] group-hover:text-white group-focus-visible:bg-[#1f8f2a] group-focus-visible:text-white">
                <Icon size={24} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold leading-6 text-[#132a20]">{title}</span>
                <span className="mt-1 block text-[14px] font-normal leading-5 text-[#56645d]">{desc}</span>
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dfe9e2] bg-white text-[#16821b] shadow-[0_2px_6px_rgba(15,23,42,0.08)] transition-transform duration-200 group-hover:translate-x-0.5">
                <ArrowRight size={20} strokeWidth={2.2} aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
