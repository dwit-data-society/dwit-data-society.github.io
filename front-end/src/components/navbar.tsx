"use client";

import { useState } from "react";
import Link from "next/link";
import logo from "@/assets/nobg.svg";

const projectLinks = [
  { label: "Current projects", detail: "Explore what we are building", href: "#projects" },
  { label: "Past projects", detail: "See what we have created", href: "#past-projects" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8"
      style={{ fontFamily: "Montserrat, sans-serif" }}
    >
      <div
        className="mx-auto flex h-[84px] max-w-[1600px] items-center justify-between rounded-2xl border border-white/35 bg-transparent px-5 shadow-[0_14px_34px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.38)] backdrop-blur-[2px] sm:px-7 lg:px-10"
        style={{ background: "rgba(11, 17, 23, 0.5)" }}
      >
        <Link href="/" className="flex items-center gap-1 text-white">
          <img src={logo.src} alt="Deerwalk Data Society" className="h-16 w-16 object-contain md:h-18 md:w-18" />
          <div className="hidden translate-y-1 flex-col items-center leading-none md:flex">
            <span
              className="bg-clip-text text-[1.5rem] font-bold tracking-[-0.03em] text-transparent"
              style={{
                background: "linear-gradient(49.68deg, #1B6196 -13.15%, #06989C 72.95%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Deerwalk
            </span>
            <span
              className="mt-[2px] ml-[9px] h-[14.68px] w-[85.4px] whitespace-nowrap text-left text-[0.75rem] font-normal leading-[14.68px] tracking-normal text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Data Society
            </span>
          </div>
        </Link>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <nav className="flex items-center gap-3">
          <a href="#about" className="flex h-11 items-center px-2 text-[1.02rem] font-semibold text-white/90 transition-colors hover:text-[#75f1e3]">
            About Us
          </a>
          <div className="relative">
            <button
              type="button"
              aria-expanded={projectsOpen}
              aria-haspopup="menu"
              onClick={() => setProjectsOpen((value) => !value)}
              className="flex h-11 items-center gap-2 px-2 text-[1.02rem] font-semibold text-white/90 transition-colors hover:text-[#75f1e3]"
            >
              Our Projects
              <svg
                aria-hidden="true"
                viewBox="0 0 12 8"
                className={`h-2.5 w-2.5 shrink-0 transition-transform duration-200 ${
                  projectsOpen ? "rotate-180" : ""
                }`}
              >
                <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
            </button>
            {projectsOpen ? (
              <div className="absolute left-0 top-full z-10 mt-7 w-80 rounded-2xl border border-white/35 bg-[#09283a]/[0.72] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-md" role="menu">
                {projectLinks.map((project) => (
                  <a
                    key={project.label}
                    href={project.href}
                    role="menuitem"
                    onClick={() => setProjectsOpen(false)}
                    className="block rounded-xl border border-white/10 px-4 py-4 transition-all hover:border-[#4de5d2]/35 hover:bg-white/[0.12]"
                  >
                    <span className="block text-base font-semibold text-white">{project.label}</span>
                    <span className="mt-1 block text-sm text-[#b9dce8]/75">{project.detail}</span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          </nav>

          <a
            href="#contact"
            className="hidden h-11 items-center rounded-xl border border-[#4de5d2]/80 bg-[#4de5d2]/[0.2] px-5 text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_16px_rgba(0,0,0,0.12)] transition-all hover:border-[#4de5d2] hover:bg-[#4de5d2]/[0.3] hover:text-[#c8fff9] focus:outline-none focus:ring-2 focus:ring-[#4de5d2]/60 sm:flex"
          >
            Contact us
          </a>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((value) => !value)}
            className="flex flex-col gap-1.5 rounded-full border border-white/15 bg-white/[0.05] p-3 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#4de5d2]/50 md:hidden"
          >
            <span className="block h-0.5 w-6 rounded-full bg-[#4de5d2]" />
            <span className="block h-0.5 w-6 rounded-full bg-[#4de5d2]" />
            <span className="block h-0.5 w-5 rounded-full bg-[#4de5d2]" />
          </button>
        </div>
      </div>

      {open ? (
        <nav className="mx-auto mt-2 max-w-[1600px] rounded-2xl border border-white/30 bg-transparent px-5 pb-4 shadow-[0_14px_34px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-[2px] sm:px-6 md:hidden" style={{ background: "rgba(11, 17, 23, 0.5)" }}>
          <a href="#about" className="flex h-11 items-center border-b border-white/15 px-1 text-sm font-semibold text-white/90 transition-colors hover:text-[#75f1e3]">
            About Us
          </a>
          <button
            type="button"
            aria-expanded={projectsOpen}
            onClick={() => setProjectsOpen((value) => !value)}
            className="flex h-11 w-full items-center justify-between border-b border-white/15 px-1 text-left text-sm font-semibold text-white/90 transition-colors hover:text-[#75f1e3]"
          >
            Our Projects
            <svg aria-hidden="true" viewBox="0 0 12 8" className={`h-2.5 w-2.5 transition-transform duration-200 ${projectsOpen ? "rotate-180" : ""}`}>
              <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
          </button>
          {projectsOpen ? (
            <div className="my-2 rounded-xl border border-white/30 bg-[#09283a]/[0.68] p-3 shadow-[0_12px_26px_rgba(0,0,0,0.24)] backdrop-blur-md">
              {projectLinks.map((project) => (
                <a key={project.label} href={project.href} className="block rounded-lg border border-white/10 px-4 py-3 transition-colors hover:border-[#4de5d2]/30 hover:bg-white/[0.1]" onClick={() => setOpen(false)}>
                  <span className="block text-base font-semibold text-white">{project.label}</span>
                  <span className="mt-0.5 block text-sm text-white/60">{project.detail}</span>
                </a>
              ))}
            </div>
          ) : null}
          <a href="#contact" className="mt-2 flex h-11 items-center rounded-xl border border-[#4de5d2]/75 bg-[#4de5d2]/[0.18] px-4 text-base font-semibold text-white transition-colors hover:border-[#4de5d2] hover:bg-[#4de5d2]/[0.28]">
            Contact us
          </a>
        </nav>
      ) : null}

    </header>
  );
}
