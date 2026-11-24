import LoginRequired from "@/components/auth/LoginRequired";
import SettingsPage from "@/features/account/SettingsPage";

export default function Page() {
  return <LoginRequired what="cài đặt tài khoản"><SettingsPage /></LoginRequired>;
}
