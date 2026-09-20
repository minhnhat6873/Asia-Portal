"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChartNoAxesCombined, GraduationCap, UsersRound } from "lucide-react";

const systems = [
  { name: "CRM", description: "Quản lý khách hàng", href: "https://wana.vn/crm", icon: UsersRound },
  { name: "Wiki", description: "Kho kiến thức nội bộ", href: "https://wiki.wana.vn", icon: BookOpen },
  { name: "LMS", description: "Đào tạo & học tập", href: "https://wana.vn/lms", icon: GraduationCap },
  { name: "ERP", description: "Quản lý doanh nghiệp", href: "https://wana.vn/app/home", icon: ChartNoAxesCombined },
];

export default function InternalSystemsMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        className={`inline-flex whitespace-nowrap items-center gap-2 rounded-lg border px-4 py-2 text-base font-semibold transition-colors ${
          open
            ? "border-[#1a7a1a] bg-green-50 text-[#0d5c0d]"
            : "border-transparent text-[#0d5c0d] hover:border-green-100 hover:bg-green-50"
        }`}
      >
        Hệ thống nội bộ Wana
        <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 pt-2">
          <div role="menu" className="w-64 overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_18px_45px_rgba(15,81,50,0.16)]">
            {systems.map(({ name, description, href, icon: Icon }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noreferrer"
                role="menuitem"
                className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-green-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-[#159447] transition-colors group-hover:bg-[#159447] group-hover:text-white">
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
