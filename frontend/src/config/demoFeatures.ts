/**
 * Registry of the six shortcuts shown in the "Công cụ & Tài nguyên" grid on
 * /about-wana#resources. None of them are wired to a real backend yet, so every shortcut
 * points at the shared /demo placeholder page which reports that the feature
 * is still a trial build.
 */

export type DemoFeature = {
  /** Value carried in the ?feature= query string. */
  slug: string;
  /** Card heading, also used as the page title on /demo. */
  label: string;
  /** One-line explanation shown on the /demo feature list. */
  summary: string;
};

/** Base path of the placeholder route, e.g. /demo/hr-portal. */
export const DEMO_BASE_PATH = "/demo";

export const DEMO_FEATURES: DemoFeature[] = [
  {
    slug: "hr-portal",
    label: "Cổng thông tin Nhân sự",
    summary: "Bảng lương, chấm công, nghỉ phép và hồ sơ cá nhân trực tuyến.",
  },
  {
    slug: "handbook-pdf",
    label: "Sổ tay Nhân viên (PDF)",
    summary: "Tài liệu quy định, chính sách và quyền lợi dành cho tân binh.",
  },
  {
    slug: "email-slack",
    label: "Hệ thống Email & Slack",
    summary: "Kênh trao đổi công việc và thảo luận nội bộ.",
  },
  {
    slug: "office-map",
    label: "Sơ đồ Văn phòng & Wifi",
    summary: "Vị trí chỗ ngồi các phòng ban, phòng họp và Wi-Fi nội bộ.",
  },
  {
    slug: "newbie-faq",
    label: "FAQ dành cho Tân Binh",
    summary: "Giải đáp thắc mắc thường gặp trong những ngày đầu làm việc.",
  },
  {
    slug: "ai-assistant",
    label: "Trợ lý AI Onboarding",
    summary: "Hỏi đáp tự động về quy trình và quy định của công ty.",
  },
];

/**
 * Builds the static /demo link a resource card should navigate to. The site is
 * exported statically, so every feature gets its own pre-rendered URL instead
 * of a query string.
 */
export function buildDemoHref(slug: string): string {
  return `${DEMO_BASE_PATH}/${slug}`;
}

/** Resolves a route slug back to its registry entry, if it is known. */
export function findDemoFeature(
  slug: string | undefined
): DemoFeature | undefined {
  if (!slug) return undefined;
  return DEMO_FEATURES.find((feature) => feature.slug === slug);
}
