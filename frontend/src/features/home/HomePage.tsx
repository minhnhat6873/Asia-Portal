import Navbar from "@/components/layout/Navbar";
import HeroBanner from "./components/HeroBanner";
import QuickLinks from "./components/QuickLinks";
import EmployeeSection from "./components/EmployeeSection";
import NewsSection from "@/features/news/components/NewsSection";
import Footer from "@/components/layout/Footer";
import ResourcesSection from "@/features/resources/ResourcesSection";
import SignedInOnly from "@/components/auth/SignedInOnly";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroBanner />
      <QuickLinks />
      <NewsSection preview={true} />
      {/* The staff directory is for signed-in accounts only. */}
      <SignedInOnly>
        <EmployeeSection />
      </SignedInOnly>
      {/* Tools are listed for everyone; guests are asked to sign in before using them. */}
      <ResourcesSection />
      <Footer />
    </main>
  );
}
