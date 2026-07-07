/**
 * config.js
 * ─────────────────────────────────────────────────────────
 * Single source of truth for theme tokens (colors, motion timing).
 *
 * WHY THIS EXISTS:
 * In the original script.js, the first chart read colors from CSS
 * custom properties (--color-nepal, --color-abroad, etc.), but every
 * chart after that hardcoded its own hex values directly in JS
 * ('#7a9e87', '#c8956a', ...). That meant the design system lived in
 * two disconnected places and could silently drift apart.
 *
 * This file reads from CSS once, with a JS fallback for anything not
 * yet defined as a custom property. Every chart imports THEME instead
 * of reading getComputedStyle() or hardcoding hex itself.
 *
 * If you add a new color to a chart, add it here (and ideally also as
 * a CSS custom property in your stylesheet) — not inline in the chart file.
 */

function cssVar(name, fallback) {
	if (typeof document === 'undefined') return fallback;
	const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	return val || fallback;
}

function prefersReducedMotion() {
	if (typeof window === 'undefined' || !window.matchMedia) return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const THEME = {
	colors: {
		neutral: cssVar('--color-neutral', '#bab5a8'),
		nepal: cssVar('--color-nepal', '#7a9e87'),
		abroad: cssVar('--color-abroad', '#c8956a'),
		accent: cssVar('--color-accent', '#d4a574'),

		// These were hardcoded independently in the gender-disparity and
		// work-mode charts in the original file (same values, copy-pasted).
		// Surfacing them here means both charts now share one definition —
		// and you get the option to promote them to real CSS custom
		// properties (--color-male / --color-male-stroke) whenever you want.
		male: cssVar('--color-male', '#7a9e87'),
		maleStroke: cssVar('--color-male-stroke', '#4a7458'),
		female: cssVar('--color-female', '#c8956a'),
		femaleStroke: cssVar('--color-female-stroke', '#8a5a30'),

		// Paper fill — used by hiring quiz torn cards, landing papers, etc.
		paperFill: cssVar('--color-paper', '#faf6ee'),

		// Challenges bubble chart palette (fill + stroke).
		bubblePalette: [
			'#e8c4a0', '#c8956a', '#d4a574', '#b8d4c8', '#7a9e87', '#a8c4b0', '#d4924a',
			'#c4a882', '#b0c8a0', '#d0b898', '#a0b8a8', '#c8b090', '#bca888', '#d4c0a0', '#a8b4a0',
		],
		bubbleStrokePalette: [
			'#a0784e', '#8a5a30', '#9a6a3e', '#6a9a80', '#4a7458', '#6a9478', '#a06020',
			'#8a7450', '#6a8860', '#9a8460', '#608870', '#8a7450', '#7a6848', '#9a8460', '#688060',
		],

		// Hiring priorities stacked bar rank colors.
		rankColors: {
			5: { fill: '#6a9a76', stroke: '#3d6e48' },
			4: { fill: '#8ab896', stroke: '#5a8a66' },
			3: { fill: '#c8b88a', stroke: '#9a8a5e' },
			2: { fill: '#cc9468', stroke: '#9a6838' },
			1: { fill: '#b86a4a', stroke: '#824428' },
		},

		// Landing page paper fills (slight tonal variations of the base paper).
		landingFills: [
			'#faf6ee', '#f7f2e8', '#f5f0e5', '#faf5ec', '#f8f3ea',
			'#f6f1e6', '#f9f4eb', '#f5efe4', '#faf7f0', '#f7f1e7',
		],
	},

	motion: {
		duration: 800,
		stagger: 35,
		// Charts should check this and skip/shorten transitions accordingly.
		reduced: prefersReducedMotion(),
	},
};
