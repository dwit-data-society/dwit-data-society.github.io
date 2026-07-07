/**
 * charts/company-maturity-scatter.js
 * ─────────────────────────────────────────────────────────
 * Three-panel scatter plot showing company age proxy (longest-serving
 * employee tenure) vs salary, benefits count, and satisfaction.
 *
 * Data lives in benefits-vs.json → analysis3_tenure_proxy_vs_outcomes.
 * Each panel shows company dots + a regression line with a shaded
 * confidence band.
 *
 * Uses the standard createChart() lifecycle. Data is loaded externally
 * by main.js (loadMaturityData) for consistent error handling.
 */

/* global d3 */
import * as d3 from 'd3';
import { createChart } from './chart-base.js';
import { createCrayonFilter } from '../utils/svg-filters.js';
import { loadJSON } from '../utils/load-data.js';
import { ensureSvg } from '../utils/dom.js';
import { THEME } from '../config.js';

/** Load and return the three scatter datasets + regressions. */
export async function loadMaturityData() {
	const raw = await loadJSON('src/data/benefits-vs.json');
	return raw.analysis3_tenure_proxy_vs_outcomes;
}

// ── Layout constants ────────────────────────────────────

const PANEL_W = 240;
const PANEL_H = 200;
const MARGIN = { top: 28, right: 16, bottom: 44, left: 48 };
const GAP = 32;

const PANELS = [
	{
		key: 'salary',
		title: 'Salary (entry, NPR)',
		scatterKey: 'scatter_salary',
		regressionKey: 'regression_by_salary_level',
		yField: 'salary_npr',
		yFormat: (d) => `${(d / 1000).toFixed(0)}k`,
		filterEntry: (d) => d.salary_level === 'Entry Level',
	},
	{
		key: 'benefits',
		title: 'Benefits Count',
		scatterKey: 'scatter_benefits',
		regressionKey: 'regression_benefits',
		yField: 'benefits_count',
		yFormat: (d) => d,
		filterEntry: null,
	},
	{
		key: 'satisfaction',
		title: 'Satisfaction (0–10)',
		scatterKey: 'scatter_satisfaction',
		regressionKey: 'regression_satisfaction',
		yField: 'satisfaction',
		yFormat: (d) => d,
		filterEntry: null,
	},
];

const PALETTE = [THEME.colors.nepal, THEME.colors.abroad, THEME.colors.accent];
const STROKE = [THEME.colors.maleStroke, THEME.colors.femaleStroke, '#9a6a3e'];

function renderPanel(g, points, regression, panel, color, stroke, filterUrl, chartW, chartH) {
	const xExtent = d3.extent(points, (d) => d.tenure_proxy);
	const yExtent = d3.extent(points, (d) => d[panel.yField]);
	const xScale = d3.scaleLinear().domain([0, xExtent[1] * 1.1]).range([0, chartW]).nice();
	const yScale = d3.scaleLinear().domain([0, yExtent[1] * 1.15]).range([chartH, 0]).nice();

	// Grid
	g.append('g').selectAll('line').data(yScale.ticks(4)).join('line')
		.attr('x1', 0).attr('x2', chartW)
		.attr('y1', (d) => yScale(d)).attr('y2', (d) => yScale(d))
		.attr('stroke', THEME.colors.neutral).attr('stroke-width', 0.5)
		.attr('stroke-dasharray', '2 2').attr('opacity', 0.3);

	// Axes
	g.append('line')
		.attr('x1', 0).attr('x2', chartW).attr('y1', chartH).attr('y2', chartH)
		.attr('stroke', '#9a9590').attr('stroke-width', 1);
	g.append('line')
		.attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', chartH)
		.attr('stroke', '#9a9590').attr('stroke-width', 1);

	// Tick labels
	g.selectAll('.x-tick').data(xScale.ticks(4)).join('text')
		.attr('class', 'x-tick')
		.attr('x', (d) => xScale(d)).attr('y', chartH + 14)
		.attr('text-anchor', 'middle').style('font-size', '9px').style('fill', '#8a8580')
		.text((d) => `${d}y`);

	g.selectAll('.y-tick').data(yScale.ticks(4)).join('text')
		.attr('class', 'y-tick')
		.attr('x', -6).attr('y', (d) => yScale(d)).attr('dy', '0.35em')
		.attr('text-anchor', 'end').style('font-size', '9px').style('fill', '#8a8580')
		.text((d) => panel.yFormat(d));

	// Regression line + band
	if (regression && regression.slope !== undefined) {
		const x0 = xScale.domain()[0];
		const x1 = xScale.domain()[1];
		const y0 = regression.intercept + regression.slope * x0;
		const y1val = regression.intercept + regression.slope * x1;

		// Shaded band (±15% of range as rough CI proxy)
		const yRange = yScale.domain()[1] - yScale.domain()[0];
		const bandW = yRange * 0.12;
		const bandArea = d3.area()
			.x((d) => xScale(d))
			.y0((d) => yScale(Math.max(0, regression.intercept + regression.slope * d - bandW)))
			.y1((d) => yScale(regression.intercept + regression.slope * d + bandW));

		const bandPts = d3.range(x0, x1, (x1 - x0) / 20).concat(x1);
		g.append('path')
			.attr('d', bandArea(bandPts))
			.attr('fill', color).attr('opacity', 0.1);

		g.append('line')
			.attr('x1', xScale(x0)).attr('x2', xScale(x1))
			.attr('y1', yScale(y0)).attr('y2', yScale(y1val))
			.attr('stroke', color).attr('stroke-width', 1.5)
			.attr('stroke-dasharray', '6 3').attr('opacity', 0.6);
	}

	// Dots
	g.selectAll('.scatter-dot').data(points).join('circle')
		.attr('class', 'scatter-dot')
		.attr('cx', (d) => xScale(d.tenure_proxy))
		.attr('cy', (d) => yScale(d[panel.yField]))
		.attr('r', 0)
		.attr('fill', color).attr('stroke', stroke).attr('stroke-width', 1.5)
		.attr('filter', filterUrl)
		.transition().delay((d, i) => i * 30).duration(500).ease(d3.easeCubicOut)
		.attr('r', 5);

	// Panel title
	g.append('text')
		.attr('x', chartW / 2).attr('y', -10)
		.attr('text-anchor', 'middle')
		.style('font-size', '11px').style('font-weight', '700').style('fill', '#4a4540')
		.text(panel.title);

	// X axis label
	g.append('text')
		.attr('x', chartW / 2).attr('y', chartH + 32)
		.attr('text-anchor', 'middle')
		.style('font-size', '9px').style('fill', '#8a8580')
		.text('Company age (years)');
}

// ── Chart factory ────────────────────────────────────────

export function createCompanyMaturityScatter(container) {
	return createChart({
		container,
		resize() { },

		render(rawData) {
			if (!rawData) return;

			const chartW = PANEL_W - MARGIN.left - MARGIN.right;
			const chartH = PANEL_H - MARGIN.top - MARGIN.bottom;
			const totalW = PANELS.length * PANEL_W + (PANELS.length - 1) * GAP;
			const totalH = PANEL_H;

			const svg = ensureSvg(this.node())
				.attr('viewBox', `0 0 ${totalW} ${totalH}`)
				.attr('preserveAspectRatio', 'xMidYMid meet');

			svg.selectAll('*').remove();

			const defs = svg.append('defs');
			const filterUrl = createCrayonFilter(defs, {
				id: 'crayon-maturity', baseFrequency: 0.04, seed: 19, scale: 2.5,
			});

			PANELS.forEach((panel, i) => {
				const offsetX = i * (PANEL_W + GAP) + MARGIN.left;
				const g = svg.append('g')
					.attr('transform', `translate(${offsetX}, ${MARGIN.top})`);

				let points = rawData[panel.scatterKey] || [];
				if (panel.filterEntry) points = points.filter(panel.filterEntry);

				// Get regression data — handle both array (salary has per-level) and object forms
				let regression = null;
				const regData = rawData[panel.regressionKey];
				if (Array.isArray(regData)) {
					regression = regData.find((r) => r.salary_level === 'Entry Level') || regData[0];
				} else if (regData) {
					regression = regData;
				}

				renderPanel(g, points, regression, panel, PALETTE[i], STROKE[i], filterUrl, chartW, chartH);
			});
		},
	});
}
