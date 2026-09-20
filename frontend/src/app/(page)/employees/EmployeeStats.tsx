import { Building2, UsersRound, ChartNoAxesColumnIncreasing } from "lucide-react";

const stats = [
  { label: "Nhân viên", value: "500+", icon: UsersRound },
  { label: "Phòng ban", value: "12", icon: Building2 },
  { label: "Đang hoạt động", value: "95%", icon: ChartNoAxesColumnIncreasing },
];

export default function EmployeeStats() {
  return (
    <section className="grid grid-cols-3 gap-2 sm:gap-3">
      {stats.map(({ label, value, icon: Icon }) => (
        <article key={label} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white p-2.5 sm:gap-3 sm:p-3 shadow-sm">
          <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-[#16894a]">
            <Icon size={19} strokeWidth={2.3} className="sm:hidden" />
            <Icon size={23} strokeWidth={2.3} className="hidden sm:block" />
          </div>
          <div>
            <p className="text-base font-black sm:text-xl leading-none text-[#08723d]">{value}</p>
            <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">{label}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
