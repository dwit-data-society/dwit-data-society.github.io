export default function AboutUs() {
  return (
    <section id="about" className="bg-[#0B1117] px-6 py-24 font-[Montserrat]">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#F3F7F8]">About Us</h2>
        <div className="mx-auto mt-3 mb-10 h-[2px] w-15 bg-[#08AAA5]" />

       {/*<div className="mx-auto mb-10 h-56 w-full max-w-md border border-[#F3F7F8]/40 sm:h-64 md:h-72" />*/}

        <p className="text-justify text-xl sm:text-2xl lg:text-[24px] leading-relaxed text-[#F3F7F8]/80">
          Deerwalk Data Society is a community based in Deerwalk Institute of
          Technology and aims to literate people through data by collecting
          data through surveys, college infrastructure and provide a report
          to the students and faculties whilst revealing interesting stories
          and patterns lying underneath the raw data.
        </p>
      </div>
    </section>
  );
}