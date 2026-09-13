import { Navbar } from "@/components/Navbar";
import Starfield from "@/components/Starfield";
import Footer from "@/components/Footer";
import AboutUs from "@/components/AboutUs";
import ProjectsSection from "@/components/ProjectSection";

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative">
        <Starfield />
        <Navbar />
      </section>
      <AboutUs />
      <ProjectsSection />
      <Footer />
    </div>
  );
}
