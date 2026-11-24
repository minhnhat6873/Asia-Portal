import LoginRequired from "@/components/auth/LoginRequired";
import ProfilePage from "@/features/account/ProfilePage";

export default function Page() {
  return <LoginRequired what="thông tin cá nhân"><ProfilePage /></LoginRequired>;
}
