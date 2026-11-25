import type { Metadata } from "next";
import { connection } from "next/server";
import MeetingPage from "@/features/meeting/MeetingPage";

export const metadata: Metadata = {
  title: "Lịch phòng họp · Asia Food & Beverage co.ltd",
};

export default async function MeetingSchedulePage() {
  await connection();
  return <MeetingPage scheduleOnly />;
}
