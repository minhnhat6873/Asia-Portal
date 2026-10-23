import {
  ChartNoAxesCombined,
  Coins,
  FlaskConical,
  Landmark,
  Monitor,
  Palette,
  ShieldCheck,
  ShoppingCart,
  Target,
  Truck,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getEmployeeDepartmentLabel } from "@/components/ui/employee-department-options";

/** Specialist departments grouped beneath the four organization divisions. */
export const ORGANIZATION_DEPARTMENTS = ([
  { id: "INTERNATIONAL_SALES", slug: "phong-kinh-doanh-quoc-te", description: "International Sales", icon: Landmark, tone: "bg-indigo-50 text-indigo-600" },
  { id: "DOMESTIC_SALES", slug: "phong-kinh-doanh-noi-dia", description: "Domestic Sales", icon: Landmark, tone: "bg-blue-50 text-blue-600" },
  { id: "SALES_ADMIN", slug: "phong-sales-admin", description: "Hỗ trợ kinh doanh", icon: UsersRound, tone: "bg-violet-50 text-violet-600" },
  { id: "MARKETING_COMMUNICATIONS", slug: "phong-marketing", description: "Marketing & Truyền thông", icon: Target, tone: "bg-violet-50 text-violet-600" },
  { id: "DESIGN", slug: "phong-design", description: "Design", icon: Palette, tone: "bg-pink-50 text-pink-500" },
  { id: "OPERATIONS_ADMIN", slug: "phong-operations-admin", description: "Điều phối vận hành", icon: UsersRound, tone: "bg-blue-50 text-blue-600" },
  { id: "SOURCING_PURCHASING", slug: "phong-mua-hang", description: "Mua hàng / Sourcing", icon: ShoppingCart, tone: "bg-amber-50 text-amber-600" },
  { id: "LOGISTICS_IMPORT_EXPORT", slug: "phong-logistics", description: "Logistics / Xuất nhập khẩu", icon: Truck, tone: "bg-orange-50 text-orange-500" },
  { id: "INVENTORY", slug: "phong-kho", description: "Kho / Inventory", icon: Truck, tone: "bg-amber-50 text-amber-600" },
  { id: "PRODUCT_DEVELOPMENT", slug: "phong-nghien-cuu-phat-trien", description: "Nghiên cứu & Phát triển sản phẩm", icon: FlaskConical, tone: "bg-teal-50 text-teal-600" },
  { id: "RA_COMPLIANCE", slug: "phong-ra-compliance", description: "Đăng ký & Tuân thủ", icon: ShieldCheck, tone: "bg-lime-50 text-lime-600" },
  { id: "FINANCE_ACCOUNTING", slug: "phong-tai-chinh-ke-toan", description: "Finance & Accounting", icon: Coins, tone: "bg-emerald-50 text-emerald-600" },
  { id: "HR_ADMIN", slug: "phong-nhan-su-hanh-chinh", description: "Human Resources & Administration", icon: UsersRound, tone: "bg-rose-50 text-rose-500" },
  { id: "LEGAL", slug: "phong-phap-che", description: "Legal", icon: ShieldCheck, tone: "bg-sky-50 text-sky-500" },
  { id: "IT_ERP", slug: "phong-it", description: "Công nghệ thông tin & ERP", icon: Monitor, tone: "bg-blue-50 text-blue-600" },
] as const).map((department) => ({ ...department, name: getEmployeeDepartmentLabel(department.id).replace(/^Phòng /, "") }));

type OrganizationDepartmentId = (typeof ORGANIZATION_DEPARTMENTS)[number]["id"];
type OrganizationDivision = {
  id: string;
  name: string;
  departmentIds: readonly OrganizationDepartmentId[];
  icon: LucideIcon;
};

export const ORGANIZATION_DIVISIONS = [
  { id: "commercial", name: "Khối kinh doanh", departmentIds: ["INTERNATIONAL_SALES", "DOMESTIC_SALES", "SALES_ADMIN", "MARKETING_COMMUNICATIONS", "DESIGN"], icon: ChartNoAxesCombined },
  { id: "operations", name: "Khối vận hành", departmentIds: ["OPERATIONS_ADMIN", "SOURCING_PURCHASING", "LOGISTICS_IMPORT_EXPORT", "INVENTORY"], icon: Truck },
  { id: "product-compliance", name: "Phát triển SP & Tuân thủ", departmentIds: ["PRODUCT_DEVELOPMENT", "RA_COMPLIANCE"], icon: FlaskConical },
  { id: "office", name: "Quản trị văn phòng", departmentIds: ["FINANCE_ACCOUNTING", "HR_ADMIN", "LEGAL", "IT_ERP"], icon: UsersRound },
] as const satisfies readonly OrganizationDivision[];

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

/** Routes and employee filters derive from the same department catalogue. */
export const DIAGRAM_DEPARTMENTS: DiagramDepartment[] = ORGANIZATION_DEPARTMENTS.map((department) => ({
  slug: department.slug,
  divisionId: ORGANIZATION_DIVISIONS.find((division) => division.departmentIds.some((id) => id === department.id))?.id,
  name: `Phòng ${department.name}`,
  employeeDepartments: [department.id],
  icon: department.icon,
  tone: department.tone,
  surface: "bg-slate-50",
  staff: 0,
  roles: [],
}));

export function findDiagramDepartment(slug: string | undefined): DiagramDepartment | undefined {
  if (!slug) return undefined;
  return DIAGRAM_DEPARTMENTS.find((department) => department.slug === slug);
}
