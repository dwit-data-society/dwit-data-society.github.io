import ProjectCard from "@/components/ProjectCard";

export default function ProjectsSection() {
  return (
    <section className="w-full  px-6 py-12 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-[1400px] text-center">
        <h2 className="group cursor-pointer relative inline-block pb-3 font-serif text-4xl text-[#F3EFE7] sm:text-5xl lg:text-6xl">
          Projects
          <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[#08AAA5] transition-all duration-300 ease-out group-hover:w-[80%]" />
        </h2>

        {/* Add / remove <ProjectCard ... /> entries here by hand */}
        <div className="mt-10 flex flex-wrap justify-center gap-6">
          <ProjectCard
            image="https://images.unsplash.com/photo-1506744038136-46273834b3fb"
            imageAlt="A beautiful mountain landscape"
            title="Mountain Escape"
            subtitle="Membership · since 2019"
            description="A peaceful retreat surrounded by mountains and nature. t surrounded by t surrounded by t surrounded by t surrounded by"
            href="/releases/meridian"
            target="_blank"/>
            <ProjectCard
            image="/assets/transparent_Logo.svg"
            imageAlt="A beautiful mountain landscape"
            title="Mountain Escape"
            subtitle="Membership · since 2019"
            description="A peaceful retreat surrounded by mountains and nature."
            href="/releases/meridian"
            target="_blank"/>
            <ProjectCard
            image="/assets/transparent_Logo.svg"
            imageAlt="A beautiful mountain landscape"
            title="Mountain Escape"
            subtitle="Membership · since 2019"
            description="A peaceful retreat surrounded by mountains and nature."
            href="/releases/meridian"
            target="_blank"/>
            <ProjectCard
            image="/assets/transparent_Logo.svg"
            imageAlt="A beautiful mountain landscape"
            title="Mountain Escape"
            subtitle="Membership · since 2019"
            description="A peaceful retreat surrounded by mountains and nature."
            href="/releases/meridian"
            target="_blank"/>
            <ProjectCard
            image="/assets/transparent_Logo.svg"
            imageAlt="A beautiful mountain landscape"
            title="Mountain Escape"
            subtitle="Membership · since 2019"
            description="A peaceful retreat surrounded by mountains and nature."
            href="/releases/meridian"
            target="_blank"/>
            <ProjectCard
            image="/assets/transparent_Logo.svg"
            imageAlt="A beautiful mountain landscape"
            title="Mountain Escape"
            subtitle="Membership · since 2019"
            description="A peaceful retreat surrounded by mountains and nature."
            href="/releases/meridian"
            target="_blank"/>
            <ProjectCard
            image="/assets/transparent_Logo.svg"
            imageAlt="A beautiful mountain landscape"
            title="Mountain Escape"
            subtitle="Membership · since 2019"
            description="A peaceful retreat surrounded by mountains and nature."
            href="/releases/meridian"
            target="_blank"/>
            <ProjectCard
            image="/assets/transparent_Logo.svg"
            imageAlt="A beautiful mountain landscape"
            title="Mountain Escape"
            subtitle="Membership · since 2019"
            description="A peaceful retreat surrounded by mountains and nature."
            href="/releases/meridian"
            target="_blank"/>
            <ProjectCard
            image="/assets/transparent_Logo.svg"
            imageAlt="A beautiful mountain landscape"
            title="Mountain Escape"
            subtitle="Membership · since 2019"
            description="A peaceful retreat surrounded by mountains and nature."
            href="/releases/meridian"
            target="_blank"/>
            <ProjectCard
            image="/assets/transparent_Logo.svg"
            imageAlt="A beautiful mountain landscape"
            title="Mountain Escape"
            subtitle="Membership · since 2019"
            description="A peaceful retreat surrounded by mountains and nature."
            href="/releases/meridian"
            target="_blank"/>
            <ProjectCard
            image="/assets/transparent_Logo.svg"
            imageAlt="A beautiful mountain landscape"
            title="Mountain Escape"
            subtitle="Membership · since 2019"
            description="A peaceful retreat surrounded by mountains and nature."
            href="/releases/meridian"
            target="_blank"/>

        
        </div>
      </div>
    </section>
  );
}