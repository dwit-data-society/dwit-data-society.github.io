/**
 * charts/salary-experience-line.js
 * ─────────────────────────────────────────────────────────
 * Migrated from original script.js lines 1241–1426 ("Salary-Experience
 * Line Chart"). Scales via viewBox + aspect-ratio; the viewBox itself is
 * layout-dependent — landscape on desktop, portrait on phones (see LAYOUTS).
 *
 * REFACTORED: data loading is now exported separately so main.js can
 * handle errors consistently. Colors use THEME.
 */

/* global d3 */
import * as d3 from 'd3';
import { createChart } from './chart-base.js';
import { createCrayonFilter } from '../utils/svg-filters.js';
import { loadCSV } from '../utils/load-data.js';
import { ensureSvg } from '../utils/dom.js';
import { isMobileViewport } from '../utils/responsive.js';
import { THEME } from '../config.js';

// Two layouts, one render. The chart scales via viewBox, so what matters on
// a phone is the RATIO of text to canvas: a 900-unit-wide viewBox squeezed
// into ~350px makes 12px labels unreadable. The mobile layout draws on a
// small portrait canvas so type and marks come out roughly 2× bigger on
// screen, with fewer ticks and a compact y-axis format to match.
const LAYOUTS = {
	desktop: {
		width: 900, height: 500,
		margin: { top: 30, right: 40, bottom: 60, left: 80 },
		xTicks: 6, yTicks: 6, gridTicks: 6,
		tickFont: 12, axisFont: 14,
		lineWidth: 3.5, dotR: 5,
		yFormat: (d) => `Nrs.${(d / 1000).toFixed(0)}k`,
		yAxisLabel: 'Estimated Salary', yLabelOffset: 65,
	},
	mobile: {
		width: 430, height: 470,
		margin: { top: 24, right: 18, bottom: 66, left: 54 },
		xTicks: 5, yTicks: 5, gridTicks: 5,
		tickFont: 13, axisFont: 15,
		lineWidth: 3, dotR: 6,
		yFormat: (d) => `${(d / 1000).toFixed(0)}k`,
		yAxisLabel: 'Estimated Salary (NPR)', yLabelOffset: 40,
	},
};

/** Load and parse the salary-experience CSV. Call from main.js with try/catch. */
export async function loadSalaryData(url = 'src/data/experience_salary.csv') {
	const data = await loadCSV(url);
	data.forEach((d) => {
		d.experience_years = +d.experience_years;
		d.estimated_salary = +d.estimated_salary;
	});
	return data;
}

export function createSalaryExperienceLine(container) {
	return createChart({
		container,
		resize() { },

		render(data) {
			if (!data || !data.length) return;

			const L = isMobileViewport() ? LAYOUTS.mobile : LAYOUTS.desktop;
			const MARGIN = L.margin;
			const chartWidth = L.width - MARGIN.left - MARGIN.right;
			const chartHeight = L.height - MARGIN.top - MARGIN.bottom;

			const svg = ensureSvg(this.node())
				.attr('viewBox', `0 0 ${L.width} ${L.height}`)
				.attr('preserveAspectRatio', 'xMidYMid meet')
				// Overrides the stylesheet's fixed 900/500 so the element's box
				// matches whichever viewBox we just drew.
				.style('aspect-ratio', `${L.width} / ${L.height}`);

			svg.selectAll('*').remove(); // idempotent — re-runs on breakpoint change

			const defs = svg.append('defs');
			const filterUrl = createCrayonFilter(defs, {
				id: 'crayon-edge-salary', baseFrequency: 0.05, seed: 7, scale: 2.5,
			});

			const xScale = d3.scaleLinear().domain([0, d3.max(data, (d) => d.experience_years)]).range([0, chartWidth]);
			const yScale = d3.scaleLinear().domain([0, d3.max(data, (d) => d.estimated_salary)]).range([chartHeight, 0]);
			const line = d3.line().x((d) => xScale(d.experience_years)).y((d) => yScale(d.estimated_salary));

			const g = svg.append('g').attr('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

			g.append('g').attr('class', 'grid-lines')
				.selectAll('line').data(yScale.ticks(L.gridTicks)).join('line')
				.attr('x1', 0).attr('x2', chartWidth).attr('y1', (d) => yScale(d)).attr('y2', (d) => yScale(d))
				.attr('stroke', THEME.colors.neutral).attr('stroke-width', 0.75).attr('stroke-dasharray', '3 2').attr('opacity', 0.4);

			g.append('line').attr('class', 'axis-line')
				.attr('x1', 0).attr('x2', chartWidth).attr('y1', chartHeight).attr('y2', chartHeight)
				.attr('stroke', '#6b6b6b').attr('stroke-width', 2);

			g.append('line').attr('class', 'axis-line')
				.attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', chartHeight)
				.attr('stroke', '#6b6b6b').attr('stroke-width', 2);

			g.selectAll('text.x-label').data(xScale.ticks(L.xTicks)).join('text')
				.attr('class', 'x-label').attr('x', (d) => xScale(d)).attr('y', chartHeight + 30)
				.attr('text-anchor', 'middle').style('font-size', `${L.tickFont}px`).style('fill', '#6b6b6b').text((d) => d);

			g.selectAll('text.y-label').data(yScale.ticks(L.yTicks)).join('text')
				.attr('class', 'y-label').attr('x', -10).attr('y', (d) => yScale(d)).attr('dy', '0.35em')
				.attr('text-anchor', 'end').style('font-size', `${L.tickFont}px`).style('fill', '#6b6b6b')
				.text(L.yFormat);

			const path = g.append('path')
				.attr('class', 'salary-line').attr('d', line(data)).attr('fill', 'none')
				.attr('stroke', THEME.colors.abroad).attr('stroke-width', L.lineWidth).attr('filter', filterUrl);

			const pathLength = path.node().getTotalLength();
			path.attr('stroke-dasharray', pathLength).attr('stroke-dashoffset', pathLength)
				.transition().duration(1200).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0);

			g.selectAll('circle.data-point').data(data).join('circle')
				.attr('class', 'data-point').attr('cx', (d) => xScale(d.experience_years)).attr('cy', (d) => yScale(d.estimated_salary))
				.attr('r', 0).attr('fill', THEME.colors.female).attr('stroke', THEME.colors.femaleStroke).attr('stroke-width', 2).attr('filter', filterUrl)
				.transition().delay((d, i) => 1000 + i * 20).duration(400).attr('r', L.dotR);

			g.append('text')
				.attr('x', chartWidth / 2).attr('y', chartHeight + 55).attr('text-anchor', 'middle')
				.style('font-size', `${L.axisFont}px`).style('font-weight', 'bold').style('fill', '#6b6b6b')
				.text('Experience (Years)');

			g.append('text')
				.attr('transform', 'rotate(-90)').attr('y', -L.yLabelOffset).attr('x', -chartHeight / 2)
				.attr('text-anchor', 'middle').style('font-size', `${L.axisFont}px`).style('font-weight', 'bold').style('fill', '#6b6b6b')
				.text(L.yAxisLabel);
		},
	});
}
