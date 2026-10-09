import { Building2, UsersRound, ChartNoAxesColumnIncreasing } from "lucide-react";

export default function EmployeeStats({
  total,
  departments,
  positions,
}: {
  total: number;
  departments: number;
  positions: number;
}) {
  const stats = [
    { label: "Nhân viên", value: total, icon: UsersRound },
    { label: "Phòng ban", value: departments, icon: Building2 },
    { label: "Chức vụ", value: positions, icon: ChartNoAxesColumnIncreasing },
  ];
  return (
    <section className="grid grid-cols-3 gap-2 sm:gap-3">
      {stats.map(({ label, value, icon: Icon }) => (
        <article key={label} className="flex min-w-0 flex-col items-center gap-1 rounded-xl border border-slate-100 bg-white p-2 text-center shadow-sm sm:flex-row sm:gap-3 sm:p-3 sm:text-left">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-50 text-[#16894a] sm:h-11 sm:w-11 sm:rounded-xl">
            <Icon size={15} strokeWidth={2.3} className="sm:hidden" />
            <Icon size={23} strokeWidth={2.3} className="hidden sm:block" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black leading-none text-[#08723d] sm:text-xl">{value}</p>
            <p className="mt-0.5 truncate text-[9px] text-slate-500 sm:text-xs">{label}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
