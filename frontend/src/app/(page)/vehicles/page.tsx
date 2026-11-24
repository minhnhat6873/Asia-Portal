import { Suspense } from "react";
import type { Metadata } from "next";
import LoginRequired from "@/components/auth/LoginRequired";
import VehicleRequestPage from "@/features/vehicles/VehicleRequestPage";

export const metadata: Metadata = { title: "Đặt xe · Asia Food & Beverage co.ltd" };

export default function Page() {
  return <LoginRequired what="trang đặt xe"><Suspense><VehicleRequestPage /></Suspense></LoginRequired>;
}
