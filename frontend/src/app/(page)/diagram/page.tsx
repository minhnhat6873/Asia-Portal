import LoginRequired from "@/components/auth/LoginRequired";
import DiagramPage from "@/features/diagram/DiagramPage";

export default function Page() {
  return <LoginRequired what="sơ đồ tổ chức"><DiagramPage /></LoginRequired>;
}
