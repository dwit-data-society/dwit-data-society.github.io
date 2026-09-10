"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import Link from "next/link";
import gsap from "gsap";

export interface Card3DProps {
  /** Cover image for the front face. Omit it and the card falls back to its base gradient. */
  image?: string;
  /** Alt text for `image`. Defaults to `title`. */
  imageAlt?: string;
  /** Title shown on the front face. Always kept to a single line — truncates with an ellipsis if it's too long. */
  title: string;
  /** Optional smaller line under the title on the front face (e.g. a category, price, or teaser). Clamped to 2 lines. */
  subtitle?: string;
  /** Revealed on the back face when the card flips. */
  description: string;
  /**
   * If set, the whole card becomes a link: clicking it (or pressing Enter
   * while it's focused) navigates here. Hover/focus still flips the card
   * first, same as without `href` — the click just also navigates.
   */
  href?: string;
  /** Passed through to the underlying link when `href` is set, e.g. "_blank". */
  target?: string;
  /** Extra classes appended to the outer, sizeable wrapper — override default sizing here. */
  className?: string;
  /** Accessible label announced by screen readers. Defaults to a label built from `title`. */
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
 * Drop-in and self-contained: just pass `image` (optional), `title`, and
 * `description`. The front face shows the image with the title/subtitle
 * below it; the back face reveals the description. Pass `href` to make
 * the whole card a link.
 *
 * - Flips 180° on hover / focus.
 * - Tilts subtly toward the pointer while idle-hovering.
 * - Renders a soft directional highlight that tracks the pointer.
 * - Falls back to a fast, tilt-free flip under `prefers-reduced-motion`.
 */
export default function Card3D({
  image,
  imageAlt,
  title,
  subtitle,
  description,
  href,
  target,
  className = "",
  ariaLabel,
}: Card3DProps) {
  // A plain object ref (not React.useRef<HTMLDivElement>) plus a callback
  // ref below, because this element is either a <div> or a Next.js <Link>
  // (which forwards to an <a>) depending on whether `href` is set.
  const wrapperRef = useRef<HTMLElement | null>(null);
  const setWrapperRef = useCallback((node: HTMLElement | null) => {
    wrapperRef.current = node;
  }, []);
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

  // ---- Cleanup: kill any in-flight tweens on unmount ---------------------
  // Without this, a card removed mid-animation (conditional render, list
  // reorder, fast refresh) leaves GSAP still writing to detached nodes,
  // which can surface as React reconciliation errors on the next commit.
  useEffect(() => {
    return () => {
      const wrapper = wrapperRef.current;
      const card = cardRef.current;
      const backContent = backContentRef.current;
      if (wrapper) gsap.killTweensOf(wrapper);
      if (card) gsap.killTweensOf(card);
      if (backContent) gsap.killTweensOf(Array.from(backContent.children));
      gsap.killTweensOf(pointer.current);
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
  const handleMouseMove = useCallback((event: MouseEvent<HTMLElement>) => {
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
    // With an `href`, a click should just navigate — don't also toggle
    // the flip (that would fight with the page transition).
    if (href) return;
    // Touch / non-hover devices: tap toggles the flip explicitly.
    if (supportsHover.current) return;
    setIsFlipped((flipped) => !flipped);
  }, [href]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (href) {
        // Let the link's native Enter-to-navigate behavior run; only
        // Escape gets special handling (flip back to front).
        if (event.key === "Escape") setIsFlipped(false);
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setIsFlipped((flipped) => !flipped);
      } else if (event.key === "Escape") {
        setIsFlipped(false);
      }
    },
    [href]
  );

  const cardFace = (
    <>
      <div
        ref={cardRef}
        className="relative h-full w-full rounded-2xl [transform-style:preserve-3d] [-webkit-transform-style:preserve-3d] [will-change:transform] shadow-[0_20px_45px_-12px_rgba(11,17,23,0.65)] ring-1 ring-foreground/10 transition-shadow duration-300 group-focus-visible:ring-2 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-transparent group-focus-visible:ring-primary/70"
      >
        {/* ---------------- Front face: image (~70%), title + subtitle below (~30%) ---------------- */}
        <div
          className="absolute inset-0 flex h-full w-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-tertiary via-background to-background [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
        >
          {image ? (
            <div className="relative h-[70%] w-full shrink-0 overflow-hidden">
              <img
                src={image}
                alt={imageAlt ?? title}
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          ) : null}

          {/* Pointer-tracked highlight, spans the whole face */}
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(circle at var(--mx) var(--my), color-mix(in srgb, var(--primary) 20%, transparent), transparent 55%)",
            }}
          />

          {/* Title + subtitle: capped to ~30% of the card when there's an
              image above them; fill the whole face and center otherwise. */}
          <div
            className={
              image
                ? "relative flex h-[30%] min-h-0 flex-col justify-center gap-1 p-3"
                : "relative flex flex-1 flex-col justify-center gap-1 p-4"
            }
          >
            <p className="truncate font-display text-base text-foreground sm:text-lg">
              {title}
            </p>
            {subtitle ? (
              <p className="line-clamp-2 text-xs leading-snug text-foreground/70">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {/* ---------------- Back face: description gets the space ---------------- */}
        <div
          className="absolute inset-0 h-full w-full overflow-hidden rounded-2xl bg-gradient-to-tl from-background via-tertiary to-secondary [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(circle at var(--mx) var(--my), color-mix(in srgb, var(--secondary) 24%, transparent), transparent 55%)",
            }}
          />
          <div
            ref={backContentRef}
            className="relative flex h-full w-full flex-col gap-2 overflow-y-auto p-5"
          >
            <p className="shrink-0 font-display text-base text-foreground">
              {title}
            </p>
            <p className="flex-1 text-sm leading-relaxed text-foreground/80">
              {description}
            </p>
          </div>
        </div>
      </div>

      {/* Announces the state change for screen reader users */}
      <span className="sr-only" aria-live="polite">
        {isFlipped ? "Showing back of card" : "Showing front of card"}
      </span>
    </>
  );

  const sharedClassName = `group relative block w-full max-w-[240px] aspect-[3/4] select-none outline-none [will-change:transform] ${className}`;

  if (href) {
    return (
      <Link
        href={href}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        ref={setWrapperRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel ?? title}
        className={`${sharedClassName} cursor-pointer`}
      >
        {cardFace}
      </Link>
    );
  }

  return (
    <div
      ref={setWrapperRef}
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
      aria-label={ariaLabel ?? `${title}. Press enter to flip and read more.`}
      className={`${sharedClassName} cursor-pointer`}
    >
      {cardFace}
    </div>
  );
}