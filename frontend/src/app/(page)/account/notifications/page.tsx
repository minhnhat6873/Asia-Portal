import LoginRequired from "@/components/auth/LoginRequired";
import NotificationsPage from "@/features/account/NotificationsPage";

export default function Page() {
  return <LoginRequired what="thông báo"><NotificationsPage /></LoginRequired>;
}
