import ProjectCard from "@/components/ProjectCard";

export default function ProjectsSection() {
  return (
    <section className="w-full  px-6 py-12 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-[1400px] text-center">
        <h2 className="group cursor-pointer relative inline-block pb-3 font-semibold text-4xl text-[#F3EFE7] sm:text-5xl lg:text-6xl">
           Our Projects
          <span className="absolute -bottom-3 left-1/2 mt-3 h-[2px] w-[20%] -translate-x-1/2 bg-primary transition-all duration-300 ease-out" />
        </h2>

        <div className="mt-15 flex flex-wrap justify-center gap-6">
        <ProjectCard
          image="/fifa.png"
          imageAlt="FIFA World Cup 2026 Prediction Analysis"
          title="World Cup Prediction"
          subtitle="Turning predictions into insights."
          description="An analysis of FIFA World Cup 2026 prediction here at DWIT, exploring champion picks, match predictions, scoring patterns, and leaderboard performance."
          href="/releases/meridian"
            target="_blank"/>



        </div>
      </div>
    </section>
  );
}