/**
 * charts/gender-disparity-bar.js
 * ─────────────────────────────────────────────────────────
 * Data is inline — the original never loaded gender.json; that file
 * exists in src/data/ but wasn't used. Kept inline here.
 *
 * REFACTORED: Now uses the standard createChart() lifecycle factory
 * so main.js can wire it the same way as every other chart
 * (chart.init().resize().render()). Colors pulled from THEME.
 */

/* global d3 */
import * as d3 from 'd3';
import { createChart } from './chart-base.js';
import { createCrayonFilter } from '../utils/svg-filters.js';
import { ensureSvg } from '../utils/dom.js';
import { isMobileViewport } from '../utils/responsive.js';
import { THEME } from '../config.js';

const DATA = [
	{ company_id: 'X9', pct_female: 20, pct_male: 80 },
	{ company_id: 'X10', pct_female: 20, pct_male: 80 },
	{ company_id: 'X3', pct_female: 26, pct_male: 74 },
	{ company_id: 'X8', pct_female: 30, pct_male: 70 },
	{ company_id: 'X16', pct_female: 30, pct_male: 70 },
	{ company_id: 'X2', pct_female: 40, pct_male: 60 },
	{ company_id: 'X4', pct_female: 40, pct_male: 60 },
	{ company_id: 'X6', pct_female: 40, pct_male: 60 },
	{ company_id: 'X11', pct_female: 40, pct_male: 60 },
	{ company_id: 'X12', pct_female: 40, pct_male: 60 },
	{ company_id: 'X13', pct_female: 40, pct_male: 60 },
	{ company_id: 'X14', pct_female: 40, pct_male: 60 },
	{ company_id: 'X17', pct_female: 40, pct_male: 60 },
	{ company_id: 'X5', pct_female: 60, pct_male: 40 },
	{ company_id: 'X7', pct_female: 60, pct_male: 40 },
].sort((a, b) => b.pct_male - a.pct_male);

const BAR_W = 36;
const BAR_GAP = 12;
const HALF_H = 160;
const MARGIN = { top: 48, right: 24, bottom: 48, left: 24 };

/** Desktop: 15 columns diverging up (male) / down (female) from a center line. */
function renderVertical(svg) {
	const chartW = DATA.length * (BAR_W + BAR_GAP) - BAR_GAP;
	const totalW = chartW + MARGIN.left + MARGIN.right;
	const totalH = HALF_H * 2 + MARGIN.top + MARGIN.bottom;

	svg.attr('viewBox', `0 0 ${totalW} ${totalH}`);

	const centerY = MARGIN.top + HALF_H;
	const g = svg.append('g');
	const yScale = d3.scaleLinear().domain([0, 100]).range([0, HALF_H]);

	// ── Axis guides ──
	g.append('line')
		.attr('x1', MARGIN.left).attr('x2', MARGIN.left + chartW)
		.attr('y1', centerY).attr('y2', centerY)
		.attr('stroke', THEME.colors.neutral).attr('stroke-width', 1)
		.attr('stroke-dasharray', '4 3');

	[25, 50, 75].forEach((pct) => {
		const dy = yScale(pct);
		['up', 'down'].forEach((dir) => {
			const y = dir === 'up' ? centerY - dy : centerY + dy;
			g.append('line')
				.attr('x1', MARGIN.left).attr('x2', MARGIN.left + chartW)
				.attr('y1', y).attr('y2', y)
				.attr('stroke', '#d6cdb8').attr('stroke-width', 0.5)
				.attr('stroke-dasharray', '2 2');
			g.append('text')
				.attr('class', 'gender-axis-label')
				.attr('x', MARGIN.left - 6).attr('y', y).attr('dy', '0.35em')
				.attr('text-anchor', 'end').text(`${pct}%`);
		});
	});

	// ── Direction labels ──
	g.append('text').attr('class', 'gender-axis-label gender-axis-label--dir')
		.attr('x', MARGIN.left + chartW / 2).attr('y', MARGIN.top / 2)
		.text('↑ Male %');
	g.append('text').attr('class', 'gender-axis-label gender-axis-label--dir')
		.attr('x', MARGIN.left + chartW / 2).attr('y', totalH - MARGIN.bottom / 2)
		.text('↓ Female %');

	// ── Bars + labels ──
	DATA.forEach((d, i) => {
		const x = MARGIN.left + i * (BAR_W + BAR_GAP);
		const mH = yScale(d.pct_male);
		const fH = yScale(d.pct_female);

		// Male (upward)
		g.append('rect').attr('class', 'gender-bar')
			.attr('x', x).attr('width', BAR_W).attr('rx', 2)
			.attr('y', centerY).attr('height', 0)
			.attr('fill', THEME.colors.male).attr('stroke', THEME.colors.maleStroke).attr('stroke-width', 1.5)
			.attr('filter', 'url(#crayon-gender)')
			.transition().delay(i * 40).duration(700).ease(d3.easeCubicOut)
			.attr('y', centerY - mH).attr('height', mH);

		// Female (downward)
		g.append('rect').attr('class', 'gender-bar')
			.attr('x', x).attr('width', BAR_W).attr('rx', 2)
			.attr('y', centerY).attr('height', 0)
			.attr('fill', THEME.colors.female).attr('stroke', THEME.colors.femaleStroke).attr('stroke-width', 1.5)
			.attr('filter', 'url(#crayon-gender)')
			.transition().delay(i * 40).duration(700).ease(d3.easeCubicOut)
			.attr('height', fH);

		// Percentage labels
		g.append('text').attr('class', 'gender-pct-label')
			.attr('x', x + BAR_W / 2).attr('y', centerY - mH - 5)
			.text(`${d.pct_male}%`).attr('opacity', 0)
			.transition().delay(i * 40 + 500).duration(300).attr('opacity', 1);

		g.append('text').attr('class', 'gender-pct-label')
			.attr('x', x + BAR_W / 2).attr('y', centerY + fH + 14)
			.text(`${d.pct_female}%`).attr('opacity', 0)
			.transition().delay(i * 40 + 500).duration(300).attr('opacity', 1);

	});
}

/** Mobile: the same diverging idea rotated 90° — one ROW per company, male
 *  extending left of a center spine, female right. A 15-column chart is
 *  hopeless at 350px wide, but 15 rows is exactly what a tall phone screen
 *  is good at, and the bars span the full viewport width. */
function renderHorizontal(svg) {
	const M = { top: 46, right: 34, bottom: 34, left: 34 };
	const BAR_H = 22;
	const GAP = 12;
	const totalW = 430;
	const half = (totalW - M.left - M.right) / 2;
	const chartH = DATA.length * (BAR_H + GAP) - GAP;
	const totalH = M.top + chartH + M.bottom;
	const centerX = M.left + half;

	svg.attr('viewBox', `0 0 ${totalW} ${totalH}`);

	const g = svg.append('g');
	const xScale = d3.scaleLinear().domain([0, 100]).range([0, half]);

	// ── Axis guides: center spine + 25/50/75% verticals both sides ──
	g.append('line')
		.attr('x1', centerX).attr('x2', centerX)
		.attr('y1', M.top - 6).attr('y2', M.top + chartH + 6)
		.attr('stroke', THEME.colors.neutral).attr('stroke-width', 1)
		.attr('stroke-dasharray', '4 3');

	[25, 50, 75].forEach((pct) => {
		const dx = xScale(pct);
		[-1, 1].forEach((side) => {
			const x = centerX + side * dx;
			g.append('line')
				.attr('x1', x).attr('x2', x)
				.attr('y1', M.top).attr('y2', M.top + chartH)
				.attr('stroke', '#d6cdb8').attr('stroke-width', 0.5)
				.attr('stroke-dasharray', '2 2');
			g.append('text')
				.attr('class', 'gender-axis-label')
				.attr('x', x).attr('y', M.top + chartH + 16)
				.style('font-size', '10px')
				.text(`${pct}`);
		});
	});

	// ── Direction labels ──
	// (text-anchor must be an inline STYLE — the .gender-axis-label class
	// sets `text-anchor: middle` in CSS, which beats presentation attributes.)
	g.append('text').attr('class', 'gender-axis-label gender-axis-label--dir')
		.attr('x', centerX - 12).attr('y', M.top / 2).attr('dy', '0.35em')
		.style('text-anchor', 'end').style('font-size', '12px')
		.text('← Male %');
	g.append('text').attr('class', 'gender-axis-label gender-axis-label--dir')
		.attr('x', centerX + 12).attr('y', M.top / 2).attr('dy', '0.35em')
		.style('text-anchor', 'start').style('font-size', '12px')
		.text('Female % →');

	// ── Bars + labels ──
	DATA.forEach((d, i) => {
		const y = M.top + i * (BAR_H + GAP);
		const mW = xScale(d.pct_male);
		const fW = xScale(d.pct_female);

		// Male (leftward)
		g.append('rect').attr('class', 'gender-bar')
			.attr('y', y).attr('height', BAR_H).attr('rx', 2)
			.attr('x', centerX).attr('width', 0)
			.attr('fill', THEME.colors.male).attr('stroke', THEME.colors.maleStroke).attr('stroke-width', 1.5)
			.attr('filter', 'url(#crayon-gender)')
			.transition().delay(i * 40).duration(700).ease(d3.easeCubicOut)
			.attr('x', centerX - mW).attr('width', mW);

		// Female (rightward)
		g.append('rect').attr('class', 'gender-bar')
			.attr('y', y).attr('height', BAR_H).attr('rx', 2)
			.attr('x', centerX).attr('width', 0)
			.attr('fill', THEME.colors.female).attr('stroke', THEME.colors.femaleStroke).attr('stroke-width', 1.5)
			.attr('filter', 'url(#crayon-gender)')
			.transition().delay(i * 40).duration(700).ease(d3.easeCubicOut)
			.attr('width', fW);

		// Percentage labels at the bar ends (anchor via style — see note above)
		g.append('text').attr('class', 'gender-pct-label')
			.attr('x', centerX - mW - 5).attr('y', y + BAR_H / 2)
			.attr('dy', '0.35em').style('text-anchor', 'end')
			.style('font-size', '11px')
			.text(`${d.pct_male}%`).attr('opacity', 0)
			.transition().delay(i * 40 + 500).duration(300).attr('opacity', 1);

		g.append('text').attr('class', 'gender-pct-label')
			.attr('x', centerX + fW + 5).attr('y', y + BAR_H / 2)
			.attr('dy', '0.35em').style('text-anchor', 'start')
			.style('font-size', '11px')
			.text(`${d.pct_female}%`).attr('opacity', 0)
			.transition().delay(i * 40 + 500).duration(300).attr('opacity', 1);
	});
}

export function createGenderDisparityBar(container) {
	return createChart({
		container,
		resize() { },

		render() {
			const svg = ensureSvg(this.node())
				.attr('preserveAspectRatio', 'xMidYMid meet');

			svg.selectAll('*').remove(); // idempotent

			const defs = svg.append('defs');
			createCrayonFilter(defs, {
				id: 'crayon-gender', baseFrequency: 0.04, seed: 5, scale: 3,
			});

			if (isMobileViewport()) renderHorizontal(svg);
			else renderVertical(svg);
		},
	});
}
