import Navbar from "@/app/components/layout/Navbar";
import NewsSection from "@/app/(page)/(home)/NewsSection";
import Footer from "@/app/components/layout/Footer";

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
