import {
  BookOpen,
  CircleHelp,
  IdCard,
  MapPin,
  MessagesSquare,
} from "lucide-react";
import { employees, departments, type Employee } from "@/config/employees";
import { buildDemoHref } from "@/config/demoFeatures";

/* ------------------------------------------------------------------------- *
 * People — feeds the "Đội ngũ" and "Tân binh" carousels
 * ------------------------------------------------------------------------- */

export type Person = {
  id: number;
  name: string;
  title: string;
  dept: string;
  deptLabel: string;
  joined: string;
  email: string;
  phone: string;
  location: string;
  avatar: string;
  quote: string;
};

/** dd/mm/yyyy -> milliseconds, so "most recent" sorts correctly. */
function parseVnDate(value: string): number {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(year, (month || 1) - 1, day || 1).getTime();
}

/**
 * The source employee records carry no personal quote, so we build a short
 * factual line from fields that DO exist instead of inventing one.
 */
function buildQuote(employee: Employee): string {
  return (
    employee.position +
    " \u00b7 " +
    employee.department +
    " \u00b7 " +
    employee.location
  );
}

function toPerson(employee: Employee): Person {
  return {
    id: employee.id,
    name: employee.name,
    title: employee.position,
    dept: employee.department,
    deptLabel: employee.department,
    joined: employee.joinDate,
    email: employee.email,
    phone: employee.phone,
    location: employee.location,
    avatar: employee.avatar,
    quote: buildQuote(employee),
  };
}

/** Every employee, mapped into the welcome-page card shape. */
export const PEOPLE: Person[] = employees.map(toPerson);

/** The board / leadership department label, taken from the config. */
const BOARD = departments[1];

/* ------------------------------------------------------------------------- *
 * Live builders — the carousels call these with the employee list from the
 * shared store, so they also pick up anyone the admin dashboard adds.
 * ------------------------------------------------------------------------- */

/** Leadership & management: the first 3 people from the board department. */
export function buildTeamData(list: Employee[]): Person[] {
  return list
    .map(toPerson)
    .filter((person) => person.dept === BOARD)
    .slice(0, 3);
}

/** Newest employees first - the "new joiner" list. */
export function buildJoinersData(list: Employee[]): Person[] {
  return [...list]
    .sort((a, b) => parseVnDate(b.joinDate) - parseVnDate(a.joinDate))
    .slice(0, 3)
    .map(toPerson);
}

/* ------------------------------------------------------------------------- *
 * Resources — feeds the "Công cụ & Tài nguyên" grid
 * ------------------------------------------------------------------------- */

/** Every lucide icon shares this signature, so we reuse one of them as the type. */
export type ResourceIcon = typeof IdCard;

export type ResourceItem = {
  title: string;
  desc: string;
  icon: ResourceIcon;
  /** Icon chip colours for the white card. */
  chipTone: string;
  /** Colour of the footer call-to-action text. */
  linkTone: string;
  linkText: string;
  /** Where the card navigates — always the /demo placeholder for now. */
  href: string;
  /** Anchor consumed by the navbar "FAQ" shortcut. */
  anchor?: string;
  /** The handbook card shows a download glyph instead of an arrow. */
  showDownloadIcon?: boolean;
};

export const RESOURCE_ITEMS: ResourceItem[] = [
  {
    title: "Cổng thông tin Nhân sự",
    desc: "Tra cứu bảng lương, chấm công, đăng ký nghỉ phép và hồ sơ cá nhân trực tuyến.",
    icon: IdCard,
    chipTone: "bg-[#f0fdf4] text-[#15803d]",
    linkTone: "text-[#15803d]",
    linkText: "Truy cập ngay",
    href: buildDemoHref("hr-portal"),
    anchor: "hr-portal",
  },
  {
    title: "Sổ tay Nhân viên (PDF)",
    desc: "Tải xuống tài liệu hướng dẫn quy định, chính sách và quyền lợi tân binh.",
    icon: BookOpen,
    chipTone: "bg-amber-50 text-amber-600",
    linkTone: "text-amber-600",
    linkText: "Tải về PDF",
    href: buildDemoHref("handbook-pdf"),
    showDownloadIcon: true,
  },
  {
    title: "Hệ thống Email & Slack",
    desc: "Kết nối nhanh channel thảo luận chung và trao đổi công việc nội bộ.",
    icon: MessagesSquare,
    chipTone: "bg-blue-50 text-blue-600",
    linkTone: "text-blue-600",
    linkText: "Đăng nhập Slack",
    href: buildDemoHref("email-slack"),
  },
  {
    title: "Sơ đồ Văn phòng & Wifi",
    desc: "Xem vị trí chỗ ngồi các phòng ban, phòng họp và mật khẩu Wi-Fi nội bộ.",
    icon: MapPin,
    chipTone: "bg-purple-50 text-purple-600",
    linkTone: "text-purple-600",
    linkText: "Xem sơ đồ",
    href: buildDemoHref("office-map"),
  },
  {
    title: "FAQ dành cho Tân Binh",
    desc: "Giải đáp 1001 thắc mắc thường gặp về ngày đầu làm việc, gửi xe, cơm trưa.",
    icon: CircleHelp,
    chipTone: "bg-emerald-50 text-emerald-600",
    linkTone: "text-emerald-600",
    linkText: "Đọc giải đáp",
    href: buildDemoHref("newbie-faq"),
    anchor: "faq",
  },
];

/* ------------------------------------------------------------------------- *
 * Onboarding roadmap — feeds the "Lộ trình Hội nhập" timeline
 * ------------------------------------------------------------------------- */

export type StepState = "done" | "current" | "upcoming";

export type StepSide = "left" | "right";

export type OnboardingStep = {
  /** Ordinal shown inside the timeline node while the step is still pending. */
  order: number;
  title: string;
  desc: string;
  /** Human readable timing label, e.g. "Ngày 1". */
  timing: string;
  state: StepState;
  /** Which side of the vertical rail the card sits on (desktop only). */
  side: StepSide;
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    order: 1,
    title: "Hoàn thiện hồ sơ nhân sự",
    desc: "Nộp đầy đủ giấy tờ cá nhân, bằng cấp tại Phòng Nhân sự (HR).",
    timing: "Ngày 1",
    state: "done",
    side: "left",
  },
  {
    order: 2,
    title: "Nhận thiết bị làm việc & tài khoản",
    desc: "Liên hệ Phòng IT nhận Laptop, Badge thẻ từ và tài khoản Email/Slack công ty.",
    timing: "Ngày 1",
    state: "done",
    side: "right",
  },
  {
    order: 3,
    title: "Buổi định hướng Onboarding",
    desc: "Tham gia buổi định hướng tập trung tìm hiểu tầm nhìn, sứ mệnh & văn hóa Asia F&B.",
    timing: "Tuần 1",
    state: "current",
    side: "left",
  },
  {
    order: 4,
    title: "Gặp gỡ Đội ngũ & Manager",
    desc: "Buổi 1-on-1 với Trưởng bộ phận để thiết lập mục tiêu thử việc (KPIs) và giao lưu nhóm.",
    timing: "Tuần 1",
    state: "upcoming",
    side: "right",
  },
  {
    order: 5,
    title: "Tham quan Nhà máy & Văn phòng",
    desc: "Tìm hiểu quy trình sản xuất thực tế tại nhà máy và văn phòng chi nhánh.",
    timing: "Tuần 2",
    state: "upcoming",
    side: "left",
  },
];

/** Share of the journey already completed, used by the overall progress bar. */
export function getCompletionPercent(steps: OnboardingStep[]): number {
  if (steps.length === 0) return 0;
  const completed = steps.filter((step) => step.state === "done").length;
  return Math.round((completed / steps.length) * 100);
}
