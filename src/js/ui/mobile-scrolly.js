/**
 * ui/mobile-scrolly.js
 * ─────────────────────────────────────────────────────────
 * Phone replacement for the scroll-driven company-grid narrative.
 *
 * On desktop, scrollama drives the grid's three beats as narrative cards
 * scroll over the sticky figure. On a phone those cards cover the whole
 * chart, so instead the figure fills the viewport and the reader taps
 * through the beats: two arrow buttons (bottom-left / bottom-right) or a
 * tap on either half of the grid itself. Step text cross-fades in a
 * reserved strip under the grid and never overlaps the visualization.
 *
 * Drives the chart through the same public step API scrollama uses
 * (stepEnter / stepProgress / applyStep) — no chart internals touched.
 */

import { isMobileViewport } from '../utils/responsive.js';

export function initMobileScrolly(chart, options = {}) {
	const {
		rootId = 'scrolly-mobile',
		figureId = 'viz-container',
		beatDuration = 700,
	} = options;

	const root = document.getElementById(rootId);
	const figure = document.getElementById(figureId);
	if (!root || !figure) return null;

	const texts = [...root.querySelectorAll('.scrolly-mobile__text')];
	const dots = [...root.querySelectorAll('.scrolly-mobile__dot')];
	const prevBtn = document.getElementById('mscrolly-prev');
	const nextBtn = document.getElementById('mscrolly-next');
	const last = texts.length - 1;

	let index = 0;
	let beatRaf = null;

	/** Ease the beat-3 entry-level highlight in over time instead of snapping,
	 *  mirroring how scroll progress reveals it on desktop. */
	function tweenBeat3() {
		cancelAnimationFrame(beatRaf);
		const t0 = performance.now();
		const frame = (now) => {
			const t = Math.min(1, (now - t0) / beatDuration);
			const eased = 1 - Math.pow(1 - t, 3);
			// stepProgress expects raw scroll progress; the beat saturates at 0.33.
			chart.stepProgress(2, eased * 0.33);
			if (t < 1) beatRaf = requestAnimationFrame(frame);
		};
		beatRaf = requestAnimationFrame(frame);
	}

	function syncUi() {
		texts.forEach((t, k) => t.classList.toggle('is-active', k === index));
		dots.forEach((d, k) => d.classList.toggle('is-active', k === index));
		if (prevBtn) prevBtn.disabled = index === 0;
		if (nextBtn) nextBtn.disabled = index === last;
	}

	/**
	 * Go to step `i`. `snap: true` skips transitions — used to restore state
	 * after the chart is re-rendered (e.g. breakpoint flip).
	 */
	function show(i, direction = 'down', { snap = false } = {}) {
		index = Math.max(0, Math.min(last, i));
		syncUi();

		cancelAnimationFrame(beatRaf);
		if (snap) {
			chart.applyStep(index);
		} else if (index === 2) {
			chart.stepEnter(2, 'down'); // snap the split, then ease the highlight in
			tweenBeat3();
		} else {
			chart.stepEnter(index, direction);
		}
	}

	const next = () => { if (index < last) show(index + 1, 'down'); };
	const prev = () => { if (index > 0) show(index - 1, 'up'); };

	if (prevBtn) prevBtn.addEventListener('click', prev);
	if (nextBtn) nextBtn.addEventListener('click', next);

	// Tapping the grid itself also navigates: left half = back, right = forward.
	figure.addEventListener('click', (e) => {
		if (!isMobileViewport()) return;                 // inert on desktop
		if (e.target.closest('.scrolly-mobile')) return; // arrows handle themselves
		const rect = figure.getBoundingClientRect();
		if (e.clientX - rect.left < rect.width / 2) prev();
		else next();
	});

	syncUi();

	return { show, next, prev, current: () => index };
}
