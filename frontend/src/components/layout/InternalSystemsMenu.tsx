"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BookOpen, ChevronDown, ChartNoAxesCombined, GraduationCap, UsersRound } from "lucide-react";

const systems = [
  { name: "CRM", description: "Quản lý khách hàng", href: "https://wana.vn/crm", icon: UsersRound },
  { name: "Wiki", description: "Kho kiến thức nội bộ", href: "https://wiki.wana.vn", icon: BookOpen },
  { name: "LMS", description: "Đào tạo & học tập", href: "https://wana.vn/lms", icon: GraduationCap },
  { name: "ERP", description: "Quản lý doanh nghiệp", href: "https://wana.vn/app/home", icon: ChartNoAxesCombined },
];

export default function InternalSystemsMenu({ mobile = false }: { mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); root.current?.querySelector("button")?.focus(); } };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  return (
    <div
      ref={root}
      className={`relative shrink-0 ${mobile ? "mt-2 border-t border-slate-100 pt-2" : ""}`}
      onMouseEnter={() => { if (!mobile) setOpen(true); }}
      onMouseLeave={() => { if (!mobile) setOpen(false); }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => mobile ? !value : true)}
        className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-base font-semibold transition-colors ${mobile ? "min-h-14 w-full justify-between text-left" : "whitespace-nowrap"} ${
          open
            ? "border-wana-green bg-wana-green-50 text-wana-green-dark"
            : "border-transparent text-wana-green-dark hover:border-wana-green-100 hover:bg-wana-green-50"
        }`}
      >
        Hệ thống nội bộ WANA
        <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div id={menuId} className={mobile ? "pt-1" : "absolute right-0 top-full z-50 pt-2"}>
          <div className={`${mobile ? "w-full" : "w-64"} overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_18px_45px_rgba(15,81,50,0.16)]`}>
            {systems.map(({ name, description, href, icon: Icon }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-wana-green-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-wana-green-50 text-wana-green transition-colors group-hover:bg-wana-green group-hover:text-white">
                  <Icon size={23} strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-gray-900">{name}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">{description}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
