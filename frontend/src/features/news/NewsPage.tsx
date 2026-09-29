import Navbar from "@/components/layout/Navbar";
import NewsSection from "@/features/news/components/NewsSection";
import Footer from "@/components/layout/Footer";

export default function TruyenThongPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <div className="relative z-10">
        <NewsSection preview={false} />
      </div>

      <Footer />
    </main>
  );
}
