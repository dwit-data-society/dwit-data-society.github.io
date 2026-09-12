import Starfield from "@/components/Starfield";
import HeroCanvas from "@/components/HeroCanvas";
import Footer from "@/components/Footer";
import ProjectCard from '@/components/ProjectCard';
import ProjectSection from '@/components/ProjectSection';
import AboutUs from "@/components/AboutUs";
import OurProjects from "@/components/OurProjects";
// import InfiniteCarousel from "@/components/InfiniteCarousel";

export default function Page() {
  return (
    <>
    {/* <HeroCanvas /> */}
     {/* <InfiniteCarousel/> */}
    <Starfield/>
    <AboutUs/>
    <ProjectSection/>
    <Footer/>
    </>
  )
}
