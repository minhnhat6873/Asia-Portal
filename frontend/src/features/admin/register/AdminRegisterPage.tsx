import type { Metadata } from "next";
import AuthFlow from "../login/AuthFlow";

export const metadata: Metadata = {
  title: "Đăng ký thành viên · Asia Internal Portal",
  description: "Trang đăng ký tài khoản cho cổng thông tin nội bộ Asia Food & Beverage.",
};

export default function AdminRegisterPage() {
  return <AuthFlow initialView="register" />;
}