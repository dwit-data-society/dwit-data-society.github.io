"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import gsap from "gsap";

export interface Card3DProps {
  /** Content shown on the front face. */
  front: ReactNode;
  /**
   * Content shown on the back face. Pass a fragment of sibling elements
   * (e.g. `<>{heading}{list}{footer}</>`) rather than one wrapping div —
   * each top-level sibling is staggered in independently on flip. The
   * back face already has padding and a column layout applied.
   */
  back: ReactNode;
  /** Extra classes appended to the outer, sizeable wrapper. */
  className?: string;
  /** Accessible label announced by screen readers. */
  ariaLabel?: string;
}

// ---- Tunable motion constants -------------------------------------------
const FLIP_DURATION = 0.9;
const FLIP_EASE = "power4.inOut";
const REDUCED_FLIP_DURATION = 0.12;

const TILT_MAX_DEG = 10;
const TILT_RESPONSE_DURATION = 0.6;
const TILT_RESPONSE_EASE = "power3.out";
const TILT_RESET_DURATION = 0.8;
const TILT_RESET_EASE = "power3.out";

const CONTENT_STAGGER = 0.07;
const CONTENT_IN_DURATION = 0.5;
const CONTENT_OUT_DURATION = 0.25;
const CONTENT_RISE_PX = 14;

type QuickSetter = (value: number) => void;

/**
 * A premium, physically-plausible 3D flip card.
 *
 * - Flips 180° on hover / focus, revealing `back`.
 * - Tilts subtly toward the pointer while idle-hovering.
 * - Renders a soft directional highlight that tracks the pointer.
 * - Falls back to a fast, tilt-free crossfade-style flip under
 *   `prefers-reduced-motion`.
 */
export default function Card3D({
  front,
  back,
  className = "",
  ariaLabel,
}: Card3DProps) {
  const wrapperRef = useRef<HTMLDivElement>(null); // pointer tilt lives here
  const cardRef = useRef<HTMLDivElement>(null); // the flipping element
  const backContentRef = useRef<HTMLDivElement>(null); // staggered children

  const [isFlipped, setIsFlipped] = useState(false);

  const prefersReducedMotion = useRef(false);
  const supportsHover = useRef(true);

  const pointer = useRef({ x: 50, y: 50 }); // percentage, drives the glare
  const setTiltX = useRef<QuickSetter | null>(null);
  const setTiltY = useRef<QuickSetter | null>(null);
  const setGlareX = useRef<QuickSetter | null>(null);
  const setGlareY = useRef<QuickSetter | null>(null);

  // ---- One-time setup: media queries + GSAP quickTo interpolators -------
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const card = cardRef.current;
    if (!wrapper || !card) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    prefersReducedMotion.current = motionQuery.matches;
    supportsHover.current = hoverQuery.matches;

    const handleMotionChange = () => {
      prefersReducedMotion.current = motionQuery.matches;
    };
    const handleHoverChange = () => {
      supportsHover.current = hoverQuery.matches;
    };
    motionQuery.addEventListener("change", handleMotionChange);
    hoverQuery.addEventListener("change", handleHoverChange);

    // Each element gets its own self-contained perspective so the tilt
    // layer and the flip layer both foreshorten correctly, independent
    // of DOM ancestry.
    gsap.set(wrapper, { transformPerspective: 1200, rotationX: 0, rotationY: 0 });
    gsap.set(card, { transformPerspective: 1200, rotationY: 0 });
    card.style.setProperty("--mx", "50%");
    card.style.setProperty("--my", "50%");

    setTiltX.current = gsap.quickTo(wrapper, "rotationX", {
      duration: TILT_RESPONSE_DURATION,
      ease: TILT_RESPONSE_EASE,
    });
    setTiltY.current = gsap.quickTo(wrapper, "rotationY", {
      duration: TILT_RESPONSE_DURATION,
      ease: TILT_RESPONSE_EASE,
    });
    setGlareX.current = gsap.quickTo(pointer.current, "x", {
      duration: TILT_RESPONSE_DURATION,
      ease: TILT_RESPONSE_EASE,
      onUpdate: () => card.style.setProperty("--mx", `${pointer.current.x}%`),
    });
    setGlareY.current = gsap.quickTo(pointer.current, "y", {
      duration: TILT_RESPONSE_DURATION,
      ease: TILT_RESPONSE_EASE,
      onUpdate: () => card.style.setProperty("--my", `${pointer.current.y}%`),
    });

    return () => {
      motionQuery.removeEventListener("change", handleMotionChange);
      hoverQuery.removeEventListener("change", handleHoverChange);
    };
  }, []);

  // ---- Flip + content stagger, driven by isFlipped -----------------------
  useEffect(() => {
    const card = cardRef.current;
    const backContent = backContentRef.current;
    if (!card) return;

    const reduced = prefersReducedMotion.current;

    gsap.to(card, {
      rotationY: isFlipped ? 180 : 0,
      duration: reduced ? REDUCED_FLIP_DURATION : FLIP_DURATION,
      ease: reduced ? "none" : FLIP_EASE,
      overwrite: "auto",
    });

    if (!backContent) return;
    const children = Array.from(backContent.children);
    if (children.length === 0) return;

    if (isFlipped) {
      gsap.fromTo(
        children,
        { opacity: 0, y: reduced ? 0 : CONTENT_RISE_PX },
        {
          opacity: 1,
          y: 0,
          duration: reduced ? 0.15 : CONTENT_IN_DURATION,
          ease: "power3.out",
          stagger: reduced ? 0 : CONTENT_STAGGER,
          delay: reduced ? 0 : (reduced ? REDUCED_FLIP_DURATION : FLIP_DURATION) * 0.45,
          overwrite: "auto",
        }
      );
    } else {
      gsap.to(children, {
        opacity: 0,
        y: reduced ? 0 : CONTENT_RISE_PX * 0.5,
        duration: CONTENT_OUT_DURATION,
        ease: "power2.in",
        overwrite: "auto",
      });
    }
  }, [isFlipped]);

  // ---- Pointer tilt + dynamic light -------------------------------------
  const handleMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion.current || !supportsHover.current) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width;
    const relY = (event.clientY - rect.top) / rect.height;

    const rotY = (relX - 0.5) * TILT_MAX_DEG * 2;
    const rotX = -(relY - 0.5) * TILT_MAX_DEG * 2;

    setTiltX.current?.(rotX);
    setTiltY.current?.(rotY);
    setGlareX.current?.(relX * 100);
    setGlareY.current?.(relY * 100);
  }, []);

  const resetTilt = useCallback(() => {
    const wrapper = wrapperRef.current;
    const card = cardRef.current;
    if (!wrapper || !card) return;

    gsap.to(wrapper, {
      rotationX: 0,
      rotationY: 0,
      duration: TILT_RESET_DURATION,
      ease: TILT_RESET_EASE,
      overwrite: "auto",
    });
    gsap.to(pointer.current, {
      x: 50,
      y: 50,
      duration: TILT_RESET_DURATION,
      ease: TILT_RESET_EASE,
      onUpdate: () => {
        card.style.setProperty("--mx", `${pointer.current.x}%`);
        card.style.setProperty("--my", `${pointer.current.y}%`);
      },
      overwrite: "auto",
    });
  }, []);

  // ---- Interaction handlers ----------------------------------------------
  const handleMouseEnter = useCallback(() => {
    if (!supportsHover.current) return;
    setIsFlipped(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!supportsHover.current) return;
    setIsFlipped(false);
    resetTilt();
  }, [resetTilt]);

  const handleFocus = useCallback(() => setIsFlipped(true), []);

  const handleBlur = useCallback(() => {
    setIsFlipped(false);
    resetTilt();
  }, [resetTilt]);

  const handleClick = useCallback(() => {
    // Touch / non-hover devices: tap toggles the flip explicitly.
    if (supportsHover.current) return;
    setIsFlipped((flipped) => !flipped);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsFlipped((flipped) => !flipped);
    } else if (event.key === "Escape") {
      setIsFlipped(false);
    }
  }, []);

  return (
    <div
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={isFlipped}
      aria-label={ariaLabel ?? "Interactive card. Press enter to flip."}
      className={`group relative w-full max-w-sm aspect-[3/4] cursor-pointer select-none outline-none [will-change:transform] ${className}`}
    >
      <div
        ref={cardRef}
        className="relative h-full w-full rounded-3xl [transform-style:preserve-3d] [-webkit-transform-style:preserve-3d] [will-change:transform] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/10 transition-shadow duration-300 group-focus-visible:ring-2 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-transparent group-focus-visible:ring-amber-200/70"
      >
        {/* ---------------- Front face ---------------- */}
        <div
          className="absolute inset-0 h-full w-full overflow-hidden rounded-3xl [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
          style={{
            background:
              "linear-gradient(155deg, #16332e 0%, #1c1a2b 70%, #1f1a2b 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(circle at var(--mx) var(--my), rgba(255,244,222,0.16), transparent 55%)",
            }}
          />
          <div className="relative h-full w-full">{front}</div>
        </div>

        {/* ---------------- Back face ---------------- */}
        <div
          className="absolute inset-0 h-full w-full overflow-hidden rounded-3xl [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{
            background:
              "linear-gradient(155deg, #1f1a2b 0%, #1c1a2b 40%, #16332e 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(circle at var(--mx) var(--my), rgba(198,161,91,0.18), transparent 55%)",
            }}
          />
          {/*
            `back` is rendered as a fragment of sibling elements (not a
            single wrapping div) so each top-level node becomes a direct
            child here and can be staggered independently on flip.
          */}
          <div
            ref={backContentRef}
            className="relative flex h-full w-full flex-col justify-between gap-4 p-7"
          >
            {back}
          </div>
        </div>
      </div>

      {/* Announces the state change for screen reader users */}
      <span className="sr-only" aria-live="polite">
        {isFlipped ? "Showing back of card" : "Showing front of card"}
      </span>
    </div>
  );
}