import Navbar from "@/components/layout/Navbar";
import HeroBanner from "./components/HeroBanner";
import QuickLinks from "./components/QuickLinks";
import EmployeeSection from "./components/EmployeeSection";
import NewsSection from "@/features/news/components/NewsSection";
import Footer from "@/components/layout/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroBanner />
      <QuickLinks />
      <EmployeeSection />
      <NewsSection preview={true} />
      <Footer />
    </main>
  );
}
