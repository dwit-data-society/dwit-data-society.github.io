"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

type BackButtonProps = {
  href?: string;
  onClick?: () => void;
  className?: string;
  label?: string;
};

export default function BackButton({
  href = "/",
  onClick,
  className = "",
  label = "Back",
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    router.push(href);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label === "Back" ? "Back to home" : label}
      title={label}
      className={`inline-flex min-h-8 items-center gap-0.5 rounded-lg px-1.5 text-sm font-semibold text-slate-400 transition-colors duration-200 hover:bg-white/10 hover:text-[#08AAA5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AAA5] sm:text-base ${className}`}
    >
      <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.8} />
      <span>{label}</span>
    </button>
  );
}
