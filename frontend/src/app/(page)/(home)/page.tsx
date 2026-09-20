import Navbar from "@/app/components/layout/Navbar";
import HeroBanner from "./HeroBanner";
import QuickLinks from "./QuickLinks";
import EmployeeSection from "./EmployeeSection";
import NewsSection from "./NewsSection";
import Footer from "@/app/components/layout/Footer";

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
