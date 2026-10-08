import {
  BookOpen,
  CircleHelp,
  IdCard,
  MapPin,
  MessagesSquare,
} from "lucide-react";

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
  /** Where the card navigates. Omit for informational cards. */
  href?: string;
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
    anchor: "hr-portal",
  },
  {
    title: "Sổ tay Nhân viên (PDF)",
    desc: "Tải xuống tài liệu hướng dẫn quy định, chính sách và quyền lợi tân binh.",
    icon: BookOpen,
    chipTone: "bg-amber-50 text-amber-600",
    linkTone: "text-amber-600",
    linkText: "Tải về PDF",
    showDownloadIcon: true,
  },
  {
    title: "Hệ thống Email & Slack",
    desc: "Kết nối nhanh channel thảo luận chung và trao đổi công việc nội bộ.",
    icon: MessagesSquare,
    chipTone: "bg-blue-50 text-blue-600",
    linkTone: "text-blue-600",
    linkText: "Đăng nhập Slack",
    href: "https://pro218.emailserver.vn/mail/?_task=mail&_mbox=INBOX",
  },
  {
    title: "Sơ đồ Văn phòng & Wifi",
    desc: "Xem vị trí chỗ ngồi các phòng ban, phòng họp và mật khẩu Wi-Fi nội bộ.",
    icon: MapPin,
    chipTone: "bg-purple-50 text-purple-600",
    linkTone: "text-purple-600",
    linkText: "Xem sơ đồ",
  },
  {
    title: "FAQ dành cho Tân Binh",
    desc: "Giải đáp 1001 thắc mắc thường gặp về ngày đầu làm việc, gửi xe, cơm trưa.",
    icon: CircleHelp,
    chipTone: "bg-emerald-50 text-emerald-600",
    linkTone: "text-emerald-600",
    linkText: "Đọc giải đáp",
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
