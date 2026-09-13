"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu } from "lucide-react";

const projectLinks = [
  {
    label: "World Cup Prediction",
    detail: "Explore insights gained from World Cup 2026 Prediction",
    href: "#projects",
  },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);

  return (
    <header
    className="fixed top-0 left-0 z-50 w-full px-4 pt-4 sm:px-6 lg:px-8"
    >
      <div
        className="mx-auto flex h-[84px] max-w-[1400px] items-center justify-between rounded-2xl border border-white/35 px-4 shadow-[0_14px_34px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.38)] backdrop-blur-[2px] sm:px-6 lg:px-8 xl:px-10"
        style={{ background: "rgba(11, 17, 23, 0.5)" }}
      >
        <Link
          href="/"
          onClick={(e) => {
            e.preventDefault();

            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });

            setOpen(false);
            setProjectsOpen(false);
          }}
          className="flex shrink-0 items-center text-white"
        >
          <img
            src="/assets/horizontal_Logo.svg"
            alt="Deerwalk Data Society"
            className="h-20 w-20 object-contain md:h-24 md:w-24 lg:h-28 lg:w-28 xl:h-32 xl:w-32"
          />
        </Link>

        <div className="ml-auto hidden items-center gap-2 md:flex lg:gap-3">
          <nav className="flex items-center gap-1 md:gap-2 lg:gap-3">
            <a
              href="#about"
              className="flex h-11 items-center px-1.5 text-sm font-semibold text-white/90 transition-colors hover:text-primary md:px-2 lg:text-base xl:text-[1.02rem]"
            >
              About Us
            </a>

            <div className="group relative">
              <a
                href="#projects"
                className="flex h-11 items-center gap-1.5 px-1.5 text-sm font-semibold text-white/90 transition-colors hover:text-primary md:px-2 lg:gap-2 lg:text-base xl:text-[1.02rem]"
              >
                Our Projects

                <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:rotate-180 lg:h-4 lg:w-4" />
              </a>

              <div
                className="invisible absolute left-0 top-full mt-3 w-72 translate-y-2 rounded-xl border border-primary/30 bg-background p-3 opacity-0 shadow-[0_18px_40px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
              >
                {projectLinks.map((project) => (
                  <a
                    key={project.label}
                    href={project.href}
                    className="block rounded-lg px-3 py-3 transition-colors hover:bg-primary/10"
                  >
                    <span className="block text-base font-semibold text-white transition-colors hover:text-primary">
                      {project.label}
                    </span>

                    <span className="mt-1 block text-sm text-white/60">
                      {project.detail}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </nav>

          <a
            href="#contact"
            className="hidden h-10 items-center rounded-xl border border-primary/80 bg-transparent px-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_16px_rgba(0,0,0,0.12)] transition-all hover:border-primary hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/60 sm:flex md:px-4 lg:h-11 lg:px-5 lg:text-base"
          >
            Contact us
          </a>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="rounded-full p-3 text-primary transition-colors hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50 md:hidden"
        >
          <Menu className="h-7 w-7" />
        </button>
      </div>

      {open ? (
        <nav
          className="mx-auto mt-2 max-w-[1400px] px-5 pb-4 sm:px-6 md:hidden"
          style={{ background: "rgba(11, 17, 23, 0.95)" }}
        >
          <a
            href="#about"
            onClick={() => setOpen(false)}
            className="flex h-11 items-center border-b border-white/10 px-1 text-sm font-semibold text-white/90 transition-colors hover:text-primary"
          >
            About Us
          </a>

          <button
            type="button"
            aria-expanded={projectsOpen}
            onClick={() => setProjectsOpen((value) => !value)}
            className="flex h-11 w-full items-center justify-between border-b border-white/10 px-1 text-left text-sm font-semibold text-white/90 transition-colors hover:text-primary"
          >
            Our Projects

            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                projectsOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {projectsOpen ? (
            <div className="my-2 bg-background px-2 py-1">
              {projectLinks.map((project) => (
                <a
                  key={project.label}
                  href={project.href}
                  onClick={() => {
                    setOpen(false);
                    setProjectsOpen(false);
                  }}
                  className="block px-2 py-3 transition-colors hover:text-primary"
                >
                  <span className="block text-base font-semibold text-white">
                    {project.label}
                  </span>

                  <span className="mt-0.5 block text-sm text-white/60">
                    {project.detail}
                  </span>
                </a>
              ))}
            </div>
          ) : null}
          <a
            href="#contact"
            onClick={() => setOpen(false)}
            className="mt-2 flex h-11 items-center px-1 text-sm font-semibold text-white/90 transition-colors hover:text-primary"
          >
            Contact us
          </a>
        </nav>
      ) : null}
    </header>
  );
}