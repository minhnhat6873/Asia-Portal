import AuthFlow from "@/features/admin/login/AuthFlow";

/** Route shell for /admin/forgot-password. The URL remains stable on refresh. */
export default function ForgotPasswordPage() {
  return <AuthFlow initialView="forgot-password" />;
}
