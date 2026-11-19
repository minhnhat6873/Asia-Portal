import type { User } from "../types";

export function AccountStatusBadge({ user, presence = false }: { user: User; presence?: boolean }) {
  const state = presence ? user.presence ?? "unknown" : user.status;
  const badges: Record<string, { label: string; color: string }> = {
    online: { label: "Online", color: "bg-[#ECFDF5] text-[#047857]" },
    offline: { label: "Offline", color: "bg-[#F1F5F9] text-[#475569]" },
    unknown: { label: "Chưa xác định", color: "bg-[#F1F5F9] text-[#475569]" },
    active: { label: "Đang hoạt động", color: "bg-[#ECFDF5] text-[#047857]" },
    pending: { label: "Chờ duyệt", color: "bg-[#FFFBEB] text-[#92400E]" },
    suspended: { label: "Đã vô hiệu hóa", color: "bg-[#FFF1F2] text-[#BE123C]" },
    rejected: { label: "Đã từ chối", color: "bg-[#FFF1F2] text-[#BE123C]" },
  };
  const badge = badges[state] ?? badges.unknown;
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${badge.color}`}>
    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />{badge.label}
  </span>;
}
