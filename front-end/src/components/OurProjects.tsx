type Project = {
  title: string;
  description: string;
  image?: string; // image path halna lai
};

// Placeholder project data pachimore projects detail array mai taphne. i havent got a clue about backend stuuf so eti nai ho
const projects: Project[] = [
  { title: "Project 1", description: "Short one-line summary of this project." },
  { title: "Project 2", description: "Short one-line summary of this project." },
  { title: "Project 3", description: "Short one-line summary of this project." },
  { title: "Project 4", description: "Short one-line summary of this project." },
];


const boxSize = "h-48 w-48 sm:h-56 sm:w-56 md:h-64 md:w-64";
const featuredSize = "h-48 w-48 sm:h-56 sm:w-56 md:h-64 md:w-64 lg:h-72 lg:w-72";

function ProjectCard({ project, size }: { project: Project; size: string }) {
  return (
    <div className="flex flex-col items-center">
      {project.image ? (
        <img
          src={project.image}
          alt={project.title}
          className={`${size} object-cover`}
        />
      ) : (
        <div className={`${size} border border-[#F3F7F8]/40`} />
      )}

      {/* Text block under each box — title + short description */}
      <p className="mt-3 text-sm font-semibold text-[#F3F7F8]">{project.title}</p>
      <p className="mt-1 max-w-[16rem] text-xs text-[#F3F7F8]/70">
        {project.description}
      </p>
    </div>
  );
}

export default function OurProjects() {
  const [featured, ...rest] = projects;

  return (
    <section id="projects" className="bg-[#0B1117] px-6 py-24 font-[Montserrat]">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-semibold text-[#F3F7F8]">Our Projects</h2>
        <div className="mx-auto mt-3 mb-14 h-[2px] w-20 bg-[#08AAA5]" />

        <div className="mb-12 flex justify-center">
          <ProjectCard project={featured} size={featuredSize} />
        </div>

        {/* place-items-center keeps each card's fixed-size box from
            stretching to fill its grid column on narrow screens */}
        <div className="grid grid-cols-1 place-items-center gap-10 sm:grid-cols-3 sm:gap-6">
          {rest.map((project) => (
            <ProjectCard key={project.title} project={project} size={boxSize} />
          ))}
        </div>
      </div>
    </section>
  );
}