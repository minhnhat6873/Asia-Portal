import type { Metadata } from "next";
import DemoScreen from "./DemoScreen";

export const metadata: Metadata = {
  title: "Bản thử nghiệm · Asia Internal Portal",
  description:
    "Thông báo tính năng đang trong bản thử nghiệm của cổng thông tin nội bộ Asia F&B.",
};

export default function DemoIndexPage() {
  return <DemoScreen />;
}
