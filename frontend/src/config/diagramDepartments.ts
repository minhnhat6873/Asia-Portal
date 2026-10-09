import {
  Coins,
  FlaskConical,
  Landmark,
  Megaphone,
  Monitor,
  Palette,
  ShieldCheck,
  ShoppingCart,
  Target,
  Truck,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Ten specialist departments shown directly below senior management. */
export const ORGANIZATION_DEPARTMENTS = [
  { id: "HR_AD", slug: "phong-nhan-su-hanh-chinh", name: "HR&AD", description: "Hành chính & Nhân sự", icon: UsersRound, tone: "bg-rose-50 text-rose-500" },
  { id: "F_AND_A", slug: "phong-tai-chinh-ke-toan", name: "F&A", description: "Tài chính & Kế toán", icon: Coins, tone: "bg-emerald-50 text-emerald-600" },
  { id: "MKT", slug: "phong-marketing", name: "MKT", description: "Marketing", icon: Target, tone: "bg-violet-50 text-violet-600" },
  { id: "DESIGN", slug: "phong-design", name: "Design", description: "Thiết kế", icon: Palette, tone: "bg-pink-50 text-pink-500" },
  { id: "LEGAL", slug: "phong-phap-che", name: "Legal", description: "Pháp chế", icon: ShieldCheck, tone: "bg-sky-50 text-sky-500" },
  { id: "IT", slug: "phong-it", name: "IT", description: "Công nghệ thông tin", icon: Monitor, tone: "bg-blue-50 text-blue-600" },
  { id: "LOGISTICS", slug: "phong-logistics", name: "Logistics", description: "Vận chuyển & Logistics", icon: Truck, tone: "bg-orange-50 text-orange-500" },
  { id: "R_AND_D", slug: "phong-nghien-cuu-phat-trien", name: "R&D", description: "Nghiên cứu & Phát triển", icon: FlaskConical, tone: "bg-teal-50 text-teal-600" },
  { id: "PURCHASING", slug: "phong-mua-hang", name: "Purchasing", description: "Mua hàng", icon: ShoppingCart, tone: "bg-amber-50 text-amber-600" },
  { id: "SALES", slug: "phong-kinh-doanh", name: "Sales", description: "Kinh doanh", icon: Landmark, tone: "bg-indigo-50 text-indigo-600" },
] as const;

export type DiagramDepartment = {
  slug: string;
  divisionId?: string;
  name: string;
  employeeDepartments?: string[];
  staff: number;
  icon: LucideIcon;
  tone: string;
  surface: string;
  roles: Array<{ name: string; staff: number }>;
};

/** Department cards and their static detail routes in the organization chart. */
export const DIAGRAM_DEPARTMENTS: DiagramDepartment[] = [
  {
    slug: "phong-truyen-thong",
    name: "Phòng Truyền thông",
    staff: 12,
    icon: Megaphone,
    tone: "bg-violet-50 text-violet-600",
    surface: "bg-violet-50/70",
    roles: [
      { name: "Brand", staff: 5 },
      { name: "Content / Social Media", staff: 4 },
      { name: "Event", staff: 3 },
    ],
  },
  {
    slug: "phong-marketing",
    divisionId: "commercial",
    name: "Phòng Marketing",
    staff: 14,
    icon: Target,
    tone: "bg-sky-50 text-sky-600",
    surface: "bg-sky-50/70",
    roles: [
      { name: "Digital Marketing", staff: 6 },
      { name: "Thiết kế", staff: 5 },
      { name: "Nghiên cứu thị trường", staff: 3 },
    ],
  },
  {
    slug: "phong-kinh-doanh",
    divisionId: "commercial",
    name: "Phòng Kinh doanh",
    employeeDepartments: ["Sales"],
    staff: 18,
    icon: Landmark,
    tone: "bg-emerald-50 text-emerald-600",
    surface: "bg-emerald-50/70",
    roles: [
      { name: "Sales Domestic", staff: 10 },
      { name: "Sales Export", staff: 6 },
      { name: "Sales Admin", staff: 2 },
    ],
  },
  {
    slug: "phong-mua-hang",
    divisionId: "operations",
    name: "Phòng Mua hàng",
    staff: 4,
    icon: ShoppingCart,
    tone: "bg-amber-50 text-amber-600",
    surface: "bg-amber-50/70",
    roles: [
      { name: "Purchasing", staff: 2 },
      { name: "Vendor Management", staff: 1 },
      { name: "Hợp đồng & báo giá", staff: 1 },
    ],
  },
];

// Keep existing URLs and connect every department page to its employee API code.
for (const department of ORGANIZATION_DEPARTMENTS) {
  const existing = DIAGRAM_DEPARTMENTS.find((item) => item.slug === department.slug);
  if (existing) {
    existing.name = `Phòng ${department.name}`;
    existing.employeeDepartments = [department.id];
  } else {
    DIAGRAM_DEPARTMENTS.push({
      slug: department.slug,
      name: `Phòng ${department.name}`,
      employeeDepartments: [department.id],
      icon: department.icon,
      tone: department.tone,
      surface: "bg-slate-50",
      staff: 0,
      roles: [],
    });
  }
}

export function findDiagramDepartment(slug: string | undefined): DiagramDepartment | undefined {
  if (!slug) return undefined;
  return DIAGRAM_DEPARTMENTS.find((department) => department.slug === slug);
}
