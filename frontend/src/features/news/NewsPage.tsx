"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import NewsSection from "@/features/news/components/NewsSection";
import Footer from "@/components/layout/Footer";

function NewsContent() {
  const searchParams = useSearchParams();
  return <NewsSection preview={false} articleId={searchParams.get("article")} />;
}

export default function TruyenThongPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <div className="relative z-10">
        <Suspense fallback={<div className="h-64 animate-pulse bg-slate-100" />}>
          <NewsContent />
        </Suspense>
      </div>

      <Footer />
    </main>
  );
}
