import type { Metadata } from "next";

import ForgotPasswordPage from "@/features/admin/forgot-password/ForgotPasswordPage";

export const metadata: Metadata = {
  title: "Quên mật khẩu | Asia Internal Portal",
};

export default function Page() {
  return <ForgotPasswordPage />;
}
