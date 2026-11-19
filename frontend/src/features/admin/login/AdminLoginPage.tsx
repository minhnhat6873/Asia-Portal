import type { Metadata } from "next";
import AuthFlow from "./AuthFlow";

export const metadata: Metadata = {
  title: "Đăng nhập hệ thống · Asia Internal Portal",
  description:
    "Trang đăng nhập và xác thực OTP dành cho nhân sự của cổng thông tin nội bộ Asia Food & Beverage co.ltd.",
};

/**
 * Route: /admin/login
 *
 * Renders the admin authentication flow (Đăng nhập ·
 * Quên mật khẩu · Xác thực OTP) modelled on the "TestAdmin" prototype and
 * re-skinned with the Asia F&B brand.
 */
export default function AdminLoginPage() {
  return <AuthFlow />;
}
