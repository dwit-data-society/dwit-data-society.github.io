import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#021a2a] text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
      <Navbar />

      <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-20 lg:px-10">
        <div className="max-w-[1100px] pt-10">
          <h1 className="mt-8 max-w-[820px] text-[3.1rem] font-black leading-[0.96] tracking-[-0.06em] text-white sm:text-[4.7rem] lg:text-[6.1rem]">
            Deerwalk Data Society
          </h1>

          <p className="mt-8 max-w-[780px] text-[1.05rem] leading-[1.6] text-[#d5edf7] sm:text-[1.45rem]">
            Programs, events, and resources for students to learn, build, and grow in data science,
            analytics, and applied research.
          </p>
        </div>
      </main>
    </div>
  );
}
