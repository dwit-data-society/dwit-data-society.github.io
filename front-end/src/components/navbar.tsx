"use client";

import { useState } from "react";
import logo from "@/assets/deerwalk-logo.png";

const links = ["Programs", "Community", "Events", "Resources"];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 bg-[#021a2a]/95 backdrop-blur-sm"
      style={{ fontFamily: "Montserrat, sans-serif" }}
    >
      <div className="mx-auto flex h-[92px] max-w-[1600px] items-center justify-between px-6 lg:px-10">
        <a href="/" className="flex items-center gap-3 text-white">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-[#4de5d2]/15 ring-1 ring-[#4de5d2]/30 md:h-14 md:w-14">
            <img src={logo.src} alt="Deerwalk Data Society" className="h-9 w-9 object-contain md:h-11 md:w-11" />
          </div>
          <div className="hidden flex-col leading-none md:flex">
            <span
              className="text-[1.08rem] font-bold tracking-[-0.03em]"
              style={{ color: "rgba(8, 170, 165, 1)" }}
            >
              Deerwalk
            </span>
            <span className="mt-[2px] text-[0.56rem] font-semibold uppercase tracking-[0.22em] text-[#8ccfe7]">
              Data Society
            </span>
          </div>
        </a>

        <nav className="hidden items-center gap-10 md:flex">
          {links.map((link, index) => (
            <a
              key={link}
              href="#"
              className={`group relative pb-2 text-[1.02rem] font-medium transition-colors ${
                index === 0 ? "text-[#4de5d2]" : "text-white/85 hover:text-white"
              }`}
            >
              <span
                className={`absolute inset-x-0 -bottom-0.5 h-[3px] origin-left scale-x-0 rounded-full transition-transform duration-300 ease-out ${
                  index === 0 ? "bg-[#4de5d2] group-hover:scale-x-100" : "bg-[#08aaa5] group-hover:scale-x-100"
                }`}
              />
              {link}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <a
            href="#"
            className="hidden rounded-full border border-[rgba(8,170,165,1)] bg-transparent px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white sm:block"
            style={{ boxShadow: "inset 0 0 0 1px rgba(8, 170, 165, 1)" }}
          >
            Sign in
          </a>
          <a
            href="#"
            className="rounded-full bg-[#4de5d2] px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-[#6ceee2]"
            style={{ color: "#000000" }}
          >
            Join us
          </a>

          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((value) => !value)}
            className="flex flex-col gap-1.5 p-2 md:hidden"
          >
            <span className="block h-0.5 w-6 rounded-full bg-[#4de5d2]" />
            <span className="block h-0.5 w-6 rounded-full bg-[#4de5d2]" />
            <span className="block h-0.5 w-5 rounded-full bg-[#4de5d2]" />
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-white/10 px-6 pb-4 md:hidden">
          {links.map((link) => (
            <a
              key={link}
              href="#"
              className="block border-b border-white/5 py-3 text-sm text-white/80 last:border-0"
            >
              {link}
            </a>
          ))}
        </nav>
      ) : null}

      <div className="h-px w-full bg-[rgba(8,170,165,1)]" />
    </header>
  );
}
