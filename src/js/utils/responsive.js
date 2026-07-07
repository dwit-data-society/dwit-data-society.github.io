/**
 * utils/responsive.js
 * ─────────────────────────────────────────────────────────
 * In the original file, exactly one thing listened for resize: the
 * scrollama scroller. Every other chart measured its container ONCE at
 * load (offsetWidth / getBoundingClientRect) and never again — so charts
 * like the work-mode drag bar go stale the moment the window is resized
 * (the SVG visually rescales via viewBox, but the JS still thinks the
 * bar is its original width, so drag math drifts off real mouse position).
 *
 * This module is the fix: any chart built with chart-base.js can be
 * "watched", and a single shared ResizeObserver will call
 * `.resize().render()` on it whenever its container's actual size changes
 * — not just on window resize, but also sidebar toggles, font-load
 * reflow, orientation change, etc.
 *
 * Usage:
 *   import { watchChart } from '../utils/responsive.js';
 *   const chart = createWorkmodeBar('#workmode-bar-wrap').init();
 *   watchChart(chart); // chart.resize() + chart.render() now stay correct
 */

const registry = new Map(); // DOM node -> chart instance
let observer = null;

function getObserver() {
	if (observer) return observer;

	observer = new ResizeObserver((entries) => {
		for (const entry of entries) {
			const chart = registry.get(entry.target);
			if (!chart) continue;
			// rAF avoids thrashing layout if multiple charts resize in the same tick
			requestAnimationFrame(() => chart.resize().render());
		}
	});

	return observer;
}

/** Start watching a chart instance's container for size changes. */
export function watchChart(chart) {
	const node = chart.node();
	registry.set(node, chart);
	getObserver().observe(node);
	return chart;
}

/** Stop watching — call this if a chart is ever removed from the page. */
export function unwatchChart(chart) {
	const node = chart.node();
	getObserver().unobserve(node);
	registry.delete(node);
}

/** Small debounce helper for cases that genuinely need window-level events
 *  (e.g. scrollama's own .resize()), rather than per-container observation. */
export function debounce(fn, wait = 150) {
	let timer;
	return (...args) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), wait);
	};
}
