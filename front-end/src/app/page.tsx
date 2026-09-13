import { Navbar } from "@/components/navbar";
import Starfield from "@/components/Starfield";
import Footer from "@/components/Footer";
import AboutUs from "@/components/AboutUs";
import OurProjects from "@/components/OurProjects";

export default function Page() {
  return (
    <div className="site-background min-h-screen bg-black text-white">
      <section className="relative min-h-screen">
        <Starfield />
        <Navbar />
      </section>
      <AboutUs />
      <OurProjects />
      <Footer />
    </div>
  );
}
