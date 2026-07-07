/**
 * charts/workmode-bar.js
 * ─────────────────────────────────────────────────────────
 * Migrated from original script.js lines 1814–2110 ("WORK MODE — ONSITE
 * VS HYBRID INTERACTIVE BAR").
 *
 * WHAT CHANGED AND WHY:
 *
 * 1. THE BUG the original measured `containerWidth` once via
 *    `containerEl.offsetWidth` at load, and used it forever after for both
 *    rendering AND the drag-position math (`pctFromX`). The SVG itself
 *    rescales fine via viewBox on resize — but the JS still thinks the bar
 *    is its original width, so after any resize (window resize, rotating
 *    a phone, a sidebar opening) the drag handle stops tracking the
 *    cursor/finger correctly. That's a real, reproducible bug, not a
 *    style nitpick.
 *
 *    Fix: `barWidth` now lives in chart.resize(), which is automatically
 *    re-run by responsive.js's ResizeObserver whenever the container's
 *    actual size changes — not just on window resize.
 *
 * 2. State (`guessOnsite`, `revealed`, `dragging`, `barWidth`) is now
 *    private to this chart's closure instead of `let`s sitting in an IIFE
 *    at file scope, mixed in with every other chart's state.
 *
 * 3. Crayon filter now comes from the shared utility (was hand-rolled).
 * 4. Colors now come from THEME (were hardcoded hex, duplicated from the
 *    gender-disparity chart).
 *
 * Everything else — the drag interaction, the reveal mechanic, the result
 * messages — is unchanged behavior, just reorganized.
 */

import * as d3 from 'd3';
import { createChart } from './chart-base.js';
import { createCrayonFilter } from '../utils/svg-filters.js';
import { THEME } from '../config.js';

const BAR_HEIGHT = 64;
const HANDLE_WIDTH = 6;
const SVG_PAD = 8;
const MIN_WIDTH_FOR_LABEL = 50;

export function createWorkmodeBar(container, options = {}) {
	const {
		actualOnsite = 27,
		initialGuess = 50,
		revealButtonId = 'workmode-reveal',
		resultElId = 'workmode-result',
		resultTextId = 'workmode-result-text',
		onsiteLabelId = 'wm-label-onsite',
		hybridLabelId = 'wm-label-hybrid',
	} = options;

	// Private state — was scattered `let`s at file scope in the original.
	let guessOnsite = initialGuess;
	let revealed = false;
	let dragging = false;
	let barWidth = 0;

	// DOM refs filled in during init()
	let svg, g, onsiteRect, hybridRect, onsitePctText, hybridPctText, handleGroup, hintText;

	function updateBar(pct, animate) {
		const onsiteW = Math.max(2, (pct / 100) * barWidth);
		const hybridW = Math.max(2, barWidth - onsiteW);
		const dur = animate && !THEME.motion.reduced ? 600 : 0;
		const tx = (sel) => (dur ? sel.transition().duration(dur).ease(d3.easeCubicInOut) : sel);

		tx(onsiteRect).attr('width', onsiteW);
		tx(hybridRect).attr('x', onsiteW).attr('width', hybridW);
		tx(handleGroup).attr('transform', `translate(${onsiteW}, 0)`);
		tx(hintText).attr('x', onsiteW);

		tx(onsitePctText).attr('x', onsiteW / 2).attr('opacity', onsiteW > MIN_WIDTH_FOR_LABEL ? 0.9 : 0);
		onsitePctText.text(`${Math.round(pct)}%`);

		tx(hybridPctText).attr('x', onsiteW + hybridW / 2).attr('opacity', hybridW > MIN_WIDTH_FOR_LABEL ? 0.9 : 0);
		hybridPctText.text(`${100 - Math.round(pct)}%`);

		const onsiteLabelEl = document.getElementById(onsiteLabelId);
		const hybridLabelEl = document.getElementById(hybridLabelId);
		if (onsiteLabelEl) onsiteLabelEl.textContent = `${Math.round(pct)}% Onsite`;
		if (hybridLabelEl) hybridLabelEl.textContent = `${100 - Math.round(pct)}% Hybrid`;
	}

	function pctFromX(clientX) {
		const rect = chart.node().getBoundingClientRect();
		const x = clientX - rect.left - SVG_PAD;
		return Math.max(5, Math.min(95, (x / barWidth) * 100));
	}

	function reveal() {
		if (revealed) return;
		revealed = true;

		svg.style('cursor', 'default');
		hintText.transition().duration(300).attr('opacity', 0);
		handleGroup.selectAll('path').transition().duration(300).attr('opacity', 0);
		updateBar(actualOnsite, true);

		const revealBtn = document.getElementById(revealButtonId);
		if (revealBtn) {
			revealBtn.style.transition = 'opacity 0.4s ease';
			revealBtn.style.opacity = '0';
			setTimeout(() => { revealBtn.style.display = 'none'; }, 400);
		}

		const subtitleEl = document.getElementById('workmode-subtitle');
		if (subtitleEl) {
			subtitleEl.style.opacity = '0';
			subtitleEl.style.display = '';
			subtitleEl.style.transition = 'opacity 0.5s ease';
			requestAnimationFrame(() => requestAnimationFrame(() => {
				subtitleEl.style.opacity = '1';
			}));
		}

		const diff = Math.abs(Math.round(guessOnsite) - actualOnsite);
		const resultEl = document.getElementById(resultElId);
		const resultText = document.getElementById(resultTextId);

		let message;
		if (diff <= 3) {
			message = `Spot on! You guessed <strong>${Math.round(guessOnsite)}%</strong> onsite — the actual figure is <strong>${actualOnsite}%</strong>. Only <strong>${actualOnsite}%</strong> of companies work fully onsite; the remaining <strong>${100 - actualOnsite}%</strong> have adopted hybrid models.`;
		} else if (diff <= 10) {
			message = `Close! You guessed <strong>${Math.round(guessOnsite)}%</strong> onsite — the actual figure is <strong>${actualOnsite}%</strong>. The vast majority (<strong>${100 - actualOnsite}%</strong>) of companies have moved to hybrid work.`;
		} else {
			message = `You guessed <strong>${Math.round(guessOnsite)}%</strong> onsite — the actual figure is just <strong>${actualOnsite}%</strong>. A striking <strong>${100 - actualOnsite}%</strong> of companies have adopted hybrid work models.`;
		}

		if (resultText && resultEl) {
			resultEl.hidden = false;
			setTimeout(() => {
				resultText.innerHTML = message;
				resultEl.style.display = 'block';
				resultEl.style.opacity = '0';
				resultEl.style.transition = 'opacity 0.5s ease';
				requestAnimationFrame(() => requestAnimationFrame(() => {
					resultEl.style.opacity = '1';
				}));
			}, 700);
		}
	}

	const chart = createChart({
		container,

		init() {
			svg = d3.select(this.node()).select('svg').empty()
				? d3.select(this.node()).append('svg')
				: d3.select(this.node()).select('svg');
			svg.attr('class', 'workmode-bar-svg');

			const defs = svg.append('defs');
			const filterUrl = createCrayonFilter(defs, {
				id: 'crayon-edge-workmode',
				baseFrequency: 0.035,
				seed: 7,
				scale: 3,
			});

			g = svg.append('g').attr('transform', `translate(${SVG_PAD}, ${SVG_PAD})`);

			onsiteRect = g.append('rect')
				.attr('y', 0).attr('height', BAR_HEIGHT).attr('rx', 3).attr('ry', 3)
				.attr('fill', THEME.colors.male).attr('stroke', THEME.colors.maleStroke)
				.attr('stroke-width', 2).attr('stroke-opacity', 0.7)
				.attr('paint-order', 'stroke fill').attr('filter', filterUrl);

			hybridRect = g.append('rect')
				.attr('y', 0).attr('height', BAR_HEIGHT).attr('rx', 3).attr('ry', 3)
				.attr('fill', THEME.colors.female).attr('stroke', THEME.colors.femaleStroke)
				.attr('stroke-width', 2).attr('stroke-opacity', 0.7)
				.attr('paint-order', 'stroke fill').attr('filter', filterUrl);

			const labelStyle = (sel) => sel
				.attr('y', BAR_HEIGHT / 2).attr('dy', '0.35em').attr('text-anchor', 'middle')
				.attr('fill', '#fff').attr('font-size', '18px').attr('font-weight', '700')
				.attr('opacity', 0.9).attr('pointer-events', 'none');

			onsitePctText = labelStyle(g.append('text'));
			hybridPctText = labelStyle(g.append('text'));

			handleGroup = g.append('g').attr('class', 'workmode-handle').style('cursor', 'ew-resize');
			handleGroup.append('rect')
				.attr('x', -HANDLE_WIDTH / 2).attr('y', -6).attr('width', HANDLE_WIDTH)
				.attr('height', BAR_HEIGHT + 12).attr('rx', 3).attr('fill', '#1a1814').attr('opacity', 0.8);

			[-8, 0, 8].forEach((dy) => {
				handleGroup.append('line')
					.attr('x1', -1.5).attr('x2', 1.5)
					.attr('y1', BAR_HEIGHT / 2 + dy).attr('y2', BAR_HEIGHT / 2 + dy)
					.attr('stroke', '#f2ede3').attr('stroke-width', 1.5).attr('stroke-linecap', 'round');
			});

			const arrowSize = 6;
			handleGroup.append('path')
				.attr('d', `M${-arrowSize - 4},${BAR_HEIGHT / 2} l${arrowSize},${-arrowSize / 2} l0,${arrowSize} Z`)
				.attr('fill', '#1a1814').attr('opacity', 0.6);
			handleGroup.append('path')
				.attr('d', `M${arrowSize + 4},${BAR_HEIGHT / 2} l${-arrowSize},${-arrowSize / 2} l0,${arrowSize} Z`)
				.attr('fill', '#1a1814').attr('opacity', 0.6);

			hintText = g.append('text')
				.attr('y', BAR_HEIGHT + 18).attr('text-anchor', 'middle')
				.attr('fill', '#6a6560').attr('font-size', '20px').attr('font-style', 'italic')
				.attr('letter-spacing', '0.05em').text('← drag to guess →');

			// Drag interaction — mouse + touch
			svg.on('mousedown', (e) => {
				if (revealed) return;
				dragging = true;
				guessOnsite = pctFromX(e.clientX);
				updateBar(guessOnsite, false);
				e.preventDefault();
			});
			d3.select(window).on('mousemove.workmode', (e) => {
				if (!dragging || revealed) return;
				guessOnsite = pctFromX(e.clientX);
				updateBar(guessOnsite, false);
			});
			d3.select(window).on('mouseup.workmode', () => { dragging = false; });

			svg.on('touchstart', (e) => {
				if (revealed) return;
				dragging = true;
				guessOnsite = pctFromX(e.touches[0].clientX);
				updateBar(guessOnsite, false);
				e.preventDefault();
			});
			svg.on('touchmove', (e) => {
				if (!dragging || revealed) return;
				guessOnsite = pctFromX(e.touches[0].clientX);
				updateBar(guessOnsite, false);
				e.preventDefault();
			});
			svg.on('touchend', () => { dragging = false; });

			const revealBtn = document.getElementById(revealButtonId);
			if (revealBtn) revealBtn.addEventListener('click', reveal);
		},

		resize({ width }) {
			// THIS is the fix: barWidth is re-measured every time the container
			// actually changes size (via responsive.js's ResizeObserver), not
			// just once at load.
			barWidth = Math.max(0, width - SVG_PAD * 2);
			svg.attr('viewBox', `0 0 ${width} ${BAR_HEIGHT + SVG_PAD * 2 + 30}`)
				.attr('preserveAspectRatio', 'xMidYMid meet');
		},

		render() {
			updateBar(guessOnsite, false);
		},
	});

	return chart;
}
