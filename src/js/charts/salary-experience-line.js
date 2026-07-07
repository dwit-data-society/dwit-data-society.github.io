/**
 * charts/salary-experience-line.js
 * ─────────────────────────────────────────────────────────
 * Migrated from original script.js lines 1241–1426 ("Salary-Experience
 * Line Chart"). Fixed viewBox (900×500), scales via CSS aspect-ratio —
 * no container-driven resize needed, same as company-grid.
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
import { THEME } from '../config.js';

const SVG_WIDTH = 900;
const SVG_HEIGHT = 500;
const MARGIN = { top: 30, right: 40, bottom: 60, left: 80 };

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

			const chartWidth = SVG_WIDTH - MARGIN.left - MARGIN.right;
			const chartHeight = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

			const svg = ensureSvg(this.node())
				.attr('viewBox', `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`)
				.attr('preserveAspectRatio', 'xMidYMid meet');

			const defs = svg.append('defs');
			const filterUrl = createCrayonFilter(defs, {
				id: 'crayon-edge-salary', baseFrequency: 0.05, seed: 7, scale: 2.5,
			});

			const xScale = d3.scaleLinear().domain([0, d3.max(data, (d) => d.experience_years)]).range([0, chartWidth]);
			const yScale = d3.scaleLinear().domain([0, d3.max(data, (d) => d.estimated_salary)]).range([chartHeight, 0]);
			const line = d3.line().x((d) => xScale(d.experience_years)).y((d) => yScale(d.estimated_salary));

			const g = svg.append('g').attr('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

			g.append('g').attr('class', 'grid-lines')
				.selectAll('line').data(yScale.ticks(6)).join('line')
				.attr('x1', 0).attr('x2', chartWidth).attr('y1', (d) => yScale(d)).attr('y2', (d) => yScale(d))
				.attr('stroke', THEME.colors.neutral).attr('stroke-width', 0.75).attr('stroke-dasharray', '3 2').attr('opacity', 0.4);

			g.append('line').attr('class', 'axis-line')
				.attr('x1', 0).attr('x2', chartWidth).attr('y1', chartHeight).attr('y2', chartHeight)
				.attr('stroke', '#6b6b6b').attr('stroke-width', 2);

			g.append('line').attr('class', 'axis-line')
				.attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', chartHeight)
				.attr('stroke', '#6b6b6b').attr('stroke-width', 2);

			g.selectAll('text.x-label').data(xScale.ticks(6)).join('text')
				.attr('class', 'x-label').attr('x', (d) => xScale(d)).attr('y', chartHeight + 30)
				.attr('text-anchor', 'middle').style('font-size', '12px').style('fill', '#6b6b6b').text((d) => d);

			g.selectAll('text.y-label').data(yScale.ticks(5)).join('text')
				.attr('class', 'y-label').attr('x', -10).attr('y', (d) => yScale(d)).attr('dy', '0.35em')
				.attr('text-anchor', 'end').style('font-size', '12px').style('fill', '#6b6b6b')
				.text((d) => `Nrs.${(d / 1000).toFixed(0)}k`);

			const path = g.append('path')
				.attr('class', 'salary-line').attr('d', line(data)).attr('fill', 'none')
				.attr('stroke', THEME.colors.abroad).attr('stroke-width', 3.5).attr('filter', filterUrl);

			const pathLength = path.node().getTotalLength();
			path.attr('stroke-dasharray', pathLength).attr('stroke-dashoffset', pathLength)
				.transition().duration(1200).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0);

			g.selectAll('circle.data-point').data(data).join('circle')
				.attr('class', 'data-point').attr('cx', (d) => xScale(d.experience_years)).attr('cy', (d) => yScale(d.estimated_salary))
				.attr('r', 0).attr('fill', THEME.colors.female).attr('stroke', THEME.colors.femaleStroke).attr('stroke-width', 2).attr('filter', filterUrl)
				.transition().delay((d, i) => 1000 + i * 20).duration(400).attr('r', 5);

			g.append('text')
				.attr('x', chartWidth / 2).attr('y', chartHeight + 55).attr('text-anchor', 'middle')
				.style('font-size', '14px').style('font-weight', 'bold').style('fill', '#6b6b6b')
				.text('Experience (Years)');

			g.append('text')
				.attr('transform', 'rotate(-90)').attr('y', -65).attr('x', -chartHeight / 2)
				.attr('text-anchor', 'middle').style('font-size', '14px').style('font-weight', 'bold').style('fill', '#6b6b6b')
				.text('Estimated Salary');
		},
	});
}
