import Link from "next/link";
import { ShieldPlus, UserRoundCog, UsersRound } from "lucide-react";

const destinations = [
  { href: "/admin/access-control/accounts", label: "Quản lý tài khoản", Icon: UserRoundCog },
  { href: "/admin/access-control/roles", label: "Nhóm quyền đã tạo", Icon: UsersRound },
  { href: "/admin/access-control/roles/new", label: "Tạo nhóm quyền", Icon: ShieldPlus },
];

export function AccessControlHome() {
  return (
    <section aria-labelledby="access-control-home-title" className="space-y-6">
      <h1 id="access-control-home-title" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Cài đặt phân quyền</h1>
      <nav aria-label="Chức năng phân quyền" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 sm:gap-6">
        {destinations.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="group flex min-h-36 min-w-0 items-center justify-center gap-4 rounded-2xl bg-white p-5 text-base font-semibold text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.025)] outline-none transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 sm:gap-5 sm:p-6 sm:text-lg">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100 sm:h-20 sm:w-20"><Icon aria-hidden="true" className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={1.8} /></span>
            <span className="min-w-0 break-words">{label}</span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
