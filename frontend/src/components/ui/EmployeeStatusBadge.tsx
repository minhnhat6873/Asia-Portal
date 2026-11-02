import { getEmployeeStatusLabel } from "./employee-status-options";

const statusStyles: Record<string, { badge: string; dot: string }> = {
  active: { badge: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500" },
  probation: { badge: "bg-amber-50 text-amber-600", dot: "bg-amber-500" },
  inactive: { badge: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
};

export function getEmployeeStatusDotClass(status?: string): string {
  return statusStyles[status ?? ""]?.dot ?? "bg-slate-400";
}

export default function EmployeeStatusBadge({ status, size = "sm", className = "" }: {
  status?: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const styles = statusStyles[status ?? ""] ?? statusStyles.inactive;
  const sizeClass = size === "md" ? "text-[15px]" : size === "xs" ? "text-[11px]" : "text-xs";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 font-semibold ${sizeClass} ${styles.badge} ${className}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${styles.dot}`} />
      {getEmployeeStatusLabel(status)}
    </span>
  );
}
