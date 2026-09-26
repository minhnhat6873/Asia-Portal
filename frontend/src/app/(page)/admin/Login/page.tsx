import type { Metadata } from "next";
import AuthFlow from "./AuthFlow";

export const metadata: Metadata = {
  title: "Đăng nhập hệ thống · Asia Internal Portal",
  description:
    "Trang đăng nhập, đăng ký và xác thực OTP dành cho nhân sự của cổng thông tin nội bộ Asia Food & Beverage.",
};

/**
 * Route: /admin/login
 *
 * Renders the four-screen admin authentication flow (Đăng nhập · Đăng ký ·
 * Quên mật khẩu · Xác thực OTP) modelled on the "TestAdmin" prototype and
 * re-skinned with the Asia F&B brand.
 */
export default function AdminLoginPage() {
  return <AuthFlow />;
}
