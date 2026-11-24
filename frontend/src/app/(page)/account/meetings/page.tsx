import LoginRequired from "@/components/auth/LoginRequired";
import MyMeetingsPage from "@/features/account/MyMeetingsPage";

export default function Page() {
  return <LoginRequired what="lịch họp của bạn"><MyMeetingsPage /></LoginRequired>;
}
