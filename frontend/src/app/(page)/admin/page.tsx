import type { Metadata } from "next";
import AdminDashboard from "./Dashboard/AdminDashboard";

export const metadata: Metadata = {
  title: "Trang quản trị hệ thống · Asia Internal Portal",
  description:
    "Bảng điều khiển quản trị nhân sự và truyền thông nội bộ Asia Food & Beverage.",
};

/**
 * Route: /admin
 *
 * Hosts the admin control dashboard (mirrored 1:1 from the standalone
 * `asia-f&b-beverage-admin` project) inside the portal. Signing in at
 * /admin/login lands here directly.
 */
export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
