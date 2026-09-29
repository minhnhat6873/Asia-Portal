import AdminDashboard from "@/features/admin/dashboard/AdminDashboard";
import type { ActiveTab } from "@/features/admin/dashboard/types";

export default function AdminRoutePage() {
  return <AdminDashboard initialTab="system-settings" />;
}