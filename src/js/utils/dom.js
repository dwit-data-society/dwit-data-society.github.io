/**
 * utils/dom.js
 * ─────────────────────────────────────────────────────────
 * Small DOM helpers shared across charts.
 *
 * NOTE ON d3 AS A GLOBAL:
 * d3 is loaded via an import map (CDN → "d3"), which means every module
 * that does `import * as d3 from 'd3'` gets the same instance. Some
 * chart files use `/* global d3 *​/` and reference it as a bare global;
 * that works because the import map also exposes it at window scope in
 * modern browsers. Both styles coexist safely.
 */

import * as d3 from 'd3';

/**
 * Get or create an <svg> element inside a container.
 * If the container IS an <svg> (e.g. `document.getElementById('my-svg')`),
 * returns a d3 selection of it directly. Otherwise appends one.
 *
 * @param {Element} container - a DOM element (the chart's root or an SVG)
 * @returns {d3.Selection} d3 selection wrapping exactly one <svg>
 */
export function ensureSvg(container) {
	const el = container instanceof d3.selection ? container.node() : container;

	if (el.tagName?.toLowerCase() === 'svg') {
		return d3.select(el);
	}

	const existing = d3.select(el).select('svg');
	if (!existing.empty()) return existing;

	return d3.select(el).append('svg');
}
