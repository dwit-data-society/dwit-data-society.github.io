"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import Link from "next/link";
import gsap from "gsap";

export interface Card3DProps {
  /** Cover image for the front face (and a faint watermark on the back). Omit it and the card falls back to its base gradient. */
  image?: string;
  /** Alt text for `image`. Defaults to `title`. */
  imageAlt?: string;
  /** Title shown on the front face. Always kept to a single line — truncates with an ellipsis if it's too long. */
  title: string;
  /** Shorter supporting text under the title on the front face. Clamped to a few lines. */
  subtitle?: string;
  /** Revealed on the back face when the card flips. Gets the remaining space and scrolls rather than clipping. */
  description: string;
  /**
   * If set, a "Read more" button appears on the back face and navigates
   * here when clicked. The card itself only ever flips on hover/focus —
   * it never navigates just from being clicked.
   */
  href?: string;
  /** Passed through to the "Read more" link when `href` is set, e.g. "_blank". */
  target?: string;
  /** Label for the back-face button. Defaults to "Read More". Only shown when `href` is set. */
  ctaLabel?: string;
  /** Extra classes appended to the outer, sizeable wrapper — override default sizing here. */
  className?: string;
  /** Accessible label announced by screen readers. Defaults to `title`. */
  ariaLabel?: string;
}

// ---- Tunable motion constants -------------------------------------------
const FLIP_DURATION = 0.9;
const FLIP_EASE = "power4.inOut";
const REDUCED_FLIP_DURATION = 0.12;

const TILT_MAX_DEG = 10;
const TILT_RESPONSE_DURATION = 0.6;
const TILT_RESPONSE_EASE = "power3.out";

const CONTENT_STAGGER = 0.07;
const CONTENT_IN_DURATION = 0.5;
const CONTENT_OUT_DURATION = 0.25;
const CONTENT_RISE_PX = 14;

type QuickSetter = (value: number) => void;

/**
 * A premium, physically-plausible 3D flip card.
 *
 * Drop-in and self-contained: pass `image` (optional), `title`,
 * `subtitle`, and `description`. Hovering or focusing the card flips it
 * to reveal the description and, if `href` is set, a "Read more" button
 * — that button is the only thing that navigates; the card itself just
 * flips.
 *
 * - Flips 180° on hover / focus.
 * - Tilts subtly toward the pointer while idle-hovering.
 * - Renders a soft directional highlight that tracks the pointer.
 * - Responsive: sizes up across breakpoints, text scales with it.
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
  ctaLabel = "Read More",
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

  // Reset back to center by redirecting the SAME quickTo-generated
  // setters, rather than firing separate gsap.to() tweens on the same
  // properties. quickTo keeps one persistent tween per property; a
  // competing tween with overwrite:"auto" on that same property leaves
  // quickTo's internal tween in a broken state, so its setter functions
  // silently stop doing anything on the next hover. Routing the reset
  // through the same setters means there's only ever one tween per
  // property, so there's nothing for it to conflict with.
  const resetTilt = useCallback(() => {
    setTiltX.current?.(0);
    setTiltY.current?.(0);
    setGlareX.current?.(50);
    setGlareY.current?.(50);
  }, []);

  // ---- Interaction handlers ----------------------------------------------
  // Note: the card only ever flips. It never navigates on its own — only
  // the "Read more" button (a real link) inside the back face does that.
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

  // Focus moving from the card to the "Read more" link inside it is still
  // focus *within* the card, not focus leaving it — only flip back and
  // reset the tilt when focus actually goes somewhere outside.
  const handleBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const next = event.relatedTarget as Node | null;
      if (next && event.currentTarget.contains(next)) return;
      setIsFlipped(false);
      resetTilt();
    },
    [resetTilt]
  );

  const handleClick = useCallback(() => {
    // Touch / non-hover devices have no hover state, so tapping the card
    // (anywhere except the "Read more" link, which stops this from
    // firing) toggles the flip instead.
    if (supportsHover.current) return;
    setIsFlipped((flipped) => !flipped);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      setIsFlipped(false);
      resetTilt();
    }
  }, [resetTilt]);

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
      role="group"
      tabIndex={0}
      aria-label={ariaLabel ?? title}
      className={`group relative block w-full max-w-[220px] select-none outline-none [will-change:transform] sm:max-w-[260px] md:max-w-[280px] aspect-[3/4] ${className}`}
    >
      <div
        ref={cardRef}
        className="relative h-full w-full rounded-2xl [transform-style:preserve-3d] [-webkit-transform-style:preserve-3d] [will-change:transform] shadow-[0_20px_45px_-12px_rgba(11,17,23,0.65)] ring-1 ring-foreground/10 transition-shadow duration-300 group-focus-visible:ring-2 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-transparent group-focus-visible:ring-primary/70"
      >
        {/* ---------------- Front face: solid dark background, image on top ---------------- */}
        <div className="absolute inset-0 flex h-full w-full flex-col overflow-hidden rounded-2xl bg-background [backface-visibility:hidden] [-webkit-backface-visibility:hidden]">
          {image ? (
            <div className="relative h-[65%] w-full shrink-0 overflow-hidden">
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
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(circle at var(--mx) var(--my), color-mix(in srgb, var(--primary) 20%, transparent), transparent 55%)",
            }}
          />

          {/* Title + subtitle below the image, sitting directly on the
              solid dark background — no box, no fade. */}
          <div
            className={
              image
                ? "relative flex flex-1 min-h-0 flex-col items-center justify-center gap-1.5 px-4 pb-4 text-center sm:px-5"
                : "relative flex flex-1 flex-col items-center justify-center gap-1.5 p-5 text-center"
            }
          >
            <p className="truncate font-display text-sm font-semibold text-foreground sm:text-base md:text-lg">
              {title}
            </p>
            {subtitle ? (
              <p className="line-clamp-4 text-left text-xs leading-relaxed text-foreground/65 sm:text-sm">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {/* ---------------- Back face: blurred image as the background, CTA pinned to the bottom ---------------- */}
        <div
          className="absolute inset-0 h-full w-full overflow-hidden rounded-2xl [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={
            image
              ? undefined
              : {
                  background:
                    "linear-gradient(200deg, var(--background) 0%, var(--tertiary) 45%, var(--secondary) 100%)",
                }
          }
        >
          {image ? (
            <>
              {/* Blurred, scaled-up cover image as the whole back-face
                  background — the scale keeps the blur from revealing
                  the (now-transparent) edges of the source image. */}
              <img
                src={image}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl brightness-[0.4] saturate-[1.25]"
              />
              {/* Scrim purely for text legibility — not a flat color
                  panel, just enough to darken the blur evenly. */}
              <div className="pointer-events-none absolute inset-0 bg-background/40" />
            </>
          ) : null}

          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(circle at var(--mx) var(--my), color-mix(in srgb, var(--secondary) 24%, transparent), transparent 55%)",
            }}
          />

          <div
            ref={backContentRef}
            className="relative flex h-full w-full flex-col p-4 sm:p-5"
          >
            <p className="shrink-0 font-display text-base font-semibold text-foreground sm:text-lg">
              {title}
            </p>
            <p className="mt-2 min-h-0 flex-1 overflow-y-auto text-xs leading-relaxed text-foreground/70 sm:text-sm">
              {description}
            </p>
            {href ? (
              <Link
                href={href}
                target={target}
                rel={target === "_blank" ? "noopener noreferrer" : undefined}
                onClick={(event) => event.stopPropagation()}
                className="mx-auto mt-4 inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-foreground/25 bg-transparent px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/10 sm:px-5 sm:py-2 sm:text-sm"
              >
                {ctaLabel}
              </Link>
            ) : null}
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