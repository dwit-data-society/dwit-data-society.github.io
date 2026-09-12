<<<<<<< HEAD
import { Navbar } from "@/components/navbar";
import background from "@/assets/samplebg.svg";
=======
import Starfield from "@/components/Starfield";
import HeroCanvas from "@/components/HeroCanvas";
import Footer from "@/components/Footer";
import AboutUs from "@/components/AboutUs";
import OurProjects from "@/components/OurProjects";
// import InfiniteCarousel from "@/components/InfiniteCarousel";
>>>>>>> origin/dev

export default function Page() {
  return (
<<<<<<< HEAD
    <div
      className="site-background min-h-screen bg-black text-white"
      style={{ backgroundImage: `url(${background.src})`, fontFamily: "Montserrat, sans-serif" }}
    >
      <Navbar />
    </div>
  );
=======
    <>
    {/* <HeroCanvas /> */}
     {/* <InfiniteCarousel/> */}
    <Starfield/>
    <AboutUs/>
    <OurProjects/>
    <Footer/>
    </>
  )
>>>>>>> origin/dev
}
