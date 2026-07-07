/**
 * charts/chart-base.js
 * ─────────────────────────────────────────────────────────
 * Adapted from the Pudding starter's base.js pattern, with two changes:
 *
 * 1. Plain ES module export instead of attaching to d3.selection.prototype.
 *    Same idea (closures hold private per-instance state, not globals) —
 *    just without extending a shared global namespace, which matters more
 *    once you have ~10 charts in one project than it does for Pudding's
 *    usual single-chart pieces.
 *
 * 2. An `update(progress)` lifecycle hook, which base.js doesn't have.
 *    Your company-grid and other scroll-driven beats (applyBeat3,
 *    applyBeat4, etc. in the original file) are exactly this — a chart
 *    reacting to a 0→1 scroll progress value. Formalizing it as part of
 *    the lifecycle means every scroll-driven chart gets the same shape.
 *
 * LIFECYCLE:
 *   init()        — build the static DOM/SVG skeleton once
 *   resize()      — recompute width/height from the container; cheap, can
 *                   run often. No-op it if your chart scales purely via
 *                   SVG viewBox (most of your charts already do this —
 *                   see the company-grid migration for an example).
 *   render(data)  — (re)draw using current data + dimensions
 *   update(progress) — react to a continuous 0→1 value (scroll position,
 *                   a slider, etc.) without a full re-render
 *   destroy()     — teardown — remove listeners, clear the container
 *
 * Usage:
 *   const chart = createChart({
 *     container: '#my-chart',
 *     init()   { ... build svg/defs once, store refs on closure vars ... },
 *     resize() { ... measure container, update width/height ... },
 *     render(data) { ... draw using this.size() and data ... },
 *   });
 *   chart.init().resize().render(myData);
 */

export function createChart({
	container,
	margin = { top: 0, right: 0, bottom: 0, left: 0 },
	init,
	resize,
	render,
	update,
	destroy,
} = {}) {
	const root = typeof container === 'string' ? document.querySelector(container) : container;
	if (!root) throw new Error(`createChart: container not found ("${container}")`);

	let width = 0;
	let height = 0;
	let data = null;
	let initialized = false;

	const chart = {
		/** The chart's container DOM node — used by responsive.js to observe it. */
		node() {
			return root;
		},

		/** Build static DOM once. Safe to call more than once; only runs the first time. */
		init(...args) {
			if (initialized) return chart;
			initialized = true;
			if (init) init.apply(chart, args);
			return chart;
		},

		/** Recompute width/height from the container's current box. */
		resize() {
			const rect = root.getBoundingClientRect();
			width = Math.max(0, rect.width - margin.left - margin.right);
			height = Math.max(0, rect.height - margin.top - margin.bottom);
			if (resize) resize.call(chart, { width, height });
			return chart;
		},

		/** Draw using current (or newly-provided) data. */
		render(newData) {
			if (newData !== undefined) data = newData;
			if (render) render.call(chart, data, { width, height });
			return chart;
		},

		/** React to a continuous progress value (e.g. scroll position 0→1). */
		update(progress, meta) {
			if (update) update.call(chart, progress, meta);
			return chart;
		},

		/** Get or set the chart's data without forcing a render. */
		data(val) {
			if (val === undefined) return data;
			data = val;
			return chart;
		},

		/** Teardown: remove listeners, clear the DOM. Called when chart is removed. */
		destroy() {
			if (destroy) destroy.call(chart);
			return chart;
		},

		/** Current measured dimensions. */
		size() {
			return { width, height };
		},
	};

	return chart;
}
