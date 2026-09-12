import { Navbar } from "@/components/navbar";
import Starfield from "@/components/Starfield";
import Footer from "@/components/Footer";
import AboutUs from "@/components/AboutUs";
import OurProjects from "@/components/OurProjects";
// import InfiniteCarousel from "@/components/InfiniteCarousel";

export default function Page() {
  return (
    <div className="site-background min-h-screen bg-black text-white">
      <Navbar />
      {/* <HeroCanvas /> */}
      {/* <InfiniteCarousel /> */}
      <Starfield />
      <AboutUs />
      <OurProjects />
      <Footer />
    </div>
  );
}
