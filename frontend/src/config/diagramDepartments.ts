import {
  Landmark,
  Megaphone,
  ShoppingCart,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

export function findDiagramDepartment(slug: string | undefined): DiagramDepartment | undefined {
  if (!slug) return undefined;
  return DIAGRAM_DEPARTMENTS.find((department) => department.slug === slug);
}
