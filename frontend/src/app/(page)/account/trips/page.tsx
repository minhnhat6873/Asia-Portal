import LoginRequired from "@/components/auth/LoginRequired";
import MyTripsPage from "@/features/account/MyTripsPage";

export default function Page() {
  return <LoginRequired what="chuyến xe của bạn"><MyTripsPage /></LoginRequired>;
}
