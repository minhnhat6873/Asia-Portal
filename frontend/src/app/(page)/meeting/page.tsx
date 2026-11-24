import type { Metadata } from "next";
import LoginRequired from "@/components/auth/LoginRequired";
import MeetingPage from "@/features/meeting/MeetingPage";

export const metadata: Metadata = {
  title: "Đặt phòng họp · Asia Food & Beverage co.ltd",
};

export default function Page() {
  return <LoginRequired what="lịch và đặt phòng họp"><MeetingPage /></LoginRequired>;
}
