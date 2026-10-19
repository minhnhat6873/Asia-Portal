import { BriefcaseBusiness, CalendarDays, Cloud, Crown, Files, Image, Settings, ShieldCheck, UserRound, Users } from "lucide-react";

export const GROUP_COLORS = [
  { id: "emerald", name: "Xanh lá", swatch: "#10b981", foreground: "#047857", background: "#ecfdf5" },
  { id: "blue", name: "Xanh dương", swatch: "#3b82f6", foreground: "#1d4ed8", background: "#eff6ff" },
  { id: "purple", name: "Tím", swatch: "#a855f7", foreground: "#7e22ce", background: "#faf5ff" },
  { id: "orange", name: "Cam", swatch: "#f97316", foreground: "#c2410c", background: "#fff7ed" },
  { id: "rose", name: "Đỏ", swatch: "#f43f5e", foreground: "#be123c", background: "#fff1f2" },
  { id: "pink", name: "Hồng", swatch: "#ec4899", foreground: "#be185d", background: "#fdf2f8" },
  { id: "slate", name: "Xám", swatch: "#94a3b8", foreground: "#475569", background: "#f1f5f9" },
] as const;

export const GROUP_ICONS = [
  { id: "shield", name: "Khiên", Icon: ShieldCheck },
  { id: "users", name: "Nhóm người", Icon: Users },
  { id: "calendar", name: "Lịch", Icon: CalendarDays },
  { id: "image", name: "Hình ảnh", Icon: Image },
  { id: "files", name: "Tài liệu", Icon: Files },
  { id: "briefcase", name: "Cặp công việc", Icon: BriefcaseBusiness },
  { id: "settings", name: "Cài đặt", Icon: Settings },
  { id: "cloud", name: "Đám mây", Icon: Cloud },
  { id: "crown", name: "Vương miện", Icon: Crown },
  { id: "user", name: "Nhân viên", Icon: UserRound },
] as const;

export type GroupColor = (typeof GROUP_COLORS)[number]["id"];
export type GroupIcon = (typeof GROUP_ICONS)[number]["id"];

export function getGroupAppearance(color?: string, icon?: string) {
  return {
    color: GROUP_COLORS.find((item) => item.id === color) ?? GROUP_COLORS[0],
    Icon: (GROUP_ICONS.find((item) => item.id === icon) ?? GROUP_ICONS[0]).Icon,
  };
}
