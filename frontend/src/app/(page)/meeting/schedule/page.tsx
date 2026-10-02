import type { Metadata } from "next";
import MeetingPage from "@/features/meeting/MeetingPage";

export const metadata: Metadata = {
  title: "Lịch phòng họp · Asia Food & Beverage",
};

export default function MeetingSchedulePage() {
  return <MeetingPage scheduleOnly />;
}
