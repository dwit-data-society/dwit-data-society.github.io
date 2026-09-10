import Starfield from "@/components/Starfield";
import HeroCanvas from "@/components/HeroCanvas";
import Footer from "@/components/Footer";
import ProjectCard from '@/components/ProjectCard';
// import InfiniteCarousel from "@/components/InfiniteCarousel";

export default function Page() {
  return (
    <>
    {/* <HeroCanvas /> */}
     {/* <InfiniteCarousel/> */}
    <Starfield/>

    <ProjectCard image="/assets/transparent_Logo.svg"
  imageAlt="A beautiful mountain landscape"
  title="Mountain Escape"
   subtitle="Membership · since 2019 Membership · since 2019Membership · since 2019Membership · since 2019Membership · since 2019"
  description="A peaceful retreat surrounded by mountains and nature.ountains and natureountains and natureountains and natureountains and natureountains and natureountains and natureountains and nature" 
   href="/releases/meridian"
  target="_blank" />
    <Footer/>
    </>
  )
}
