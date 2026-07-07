/**
 * charts/training-charts.js
 * ─────────────────────────────────────────────────────────
 * Two visualizations side-by-side:
 *   1. Donut chart — does/doesn't offer structured training (training_donut.csv)
 *   2. Dot plot — training frequency in years per company (training_frequency.csv)
 *
 * Uses the standard createChart() lifecycle. Data is loaded externally
 * by main.js (loadTrainingData) for consistent error handling.
 */

/* global d3 */
import * as d3 from 'd3';
import { createChart } from './chart-base.js';
import { createCrayonFilter } from '../utils/svg-filters.js';
import { loadCSV } from '../utils/load-data.js';
import { ensureSvg } from '../utils/dom.js';
import { THEME } from '../config.js';

/** Load both CSVs and return them as { donut, frequency }. */
export async function loadTrainingData() {
	const [donut, frequency] = await Promise.all([
		loadCSV('src/data/training_donut.csv'),
		loadCSV('src/data/training_frequency.csv'),
	]);
	donut.forEach((d) => { d.count = +d.count; d.pct = +d.pct; });
	frequency.forEach((d) => { d.training_frequency_years = +d.training_frequency_years; });
	return { donut, frequency };
}

// ── Donut chart ──────────────────────────────────────────

const DONUT_SIZE = 260;
const DONUT_OUTER = 100;
const DONUT_INNER = 55;

function renderDonut(container, data) {
	const svg = ensureSvg(container)
		.attr('viewBox', `0 0 ${DONUT_SIZE} ${DONUT_SIZE}`)
		.attr('preserveAspectRatio', 'xMidYMid meet');

	svg.selectAll('*').remove();

	const defs = svg.append('defs');
	const filterUrl = createCrayonFilter(defs, {
		id: 'crayon-training-donut', baseFrequency: 0.04, seed: 11, scale: 3,
	});

	const g = svg.append('g')
		.attr('transform', `translate(${DONUT_SIZE / 2}, ${DONUT_SIZE / 2})`);

	const pie = d3.pie().value((d) => d.count).sort(null).padAngle(0.03);
	const arc = d3.arc().innerRadius(DONUT_INNER).outerRadius(DONUT_OUTER).cornerRadius(3);

	const colors = [THEME.colors.neutral, THEME.colors.nepal];

	const arcs = g.selectAll('.donut-arc')
		.data(pie(data))
		.join('path')
		.attr('class', 'donut-arc')
		.attr('fill', (d, i) => colors[i])
		.attr('stroke', (d, i) => d3.color(colors[i]).darker(0.6))
		.attr('stroke-width', 1.5)
		.attr('filter', filterUrl);

	// Animate from zero
	const arcTween = (d) => {
		const interp = d3.interpolate({ startAngle: d.startAngle, endAngle: d.startAngle }, d);
		return (t) => arc(interp(t));
	};
	arcs.attr('d', arc({ startAngle: 0, endAngle: 0 }))
		.transition().duration(800).ease(d3.easeCubicOut)
		.attrTween('d', arcTween);

	// Labels outside arcs
	const labelArc = d3.arc().innerRadius(DONUT_OUTER + 14).outerRadius(DONUT_OUTER + 14);
	g.selectAll('.donut-label')
		.data(pie(data))
		.join('text')
		.attr('class', 'donut-label')
		.attr('transform', (d) => `translate(${labelArc.centroid(d)})`)
		.attr('text-anchor', 'middle')
		.attr('dy', '0.35em')
		.style('font-size', '11px')
		.style('fill', '#6b6b6b')
		.style('font-weight', '600')
		.text((d) => `${d.data.label} (${d.data.pct}%)`)
		.attr('opacity', 0)
		.transition().delay(600).duration(400).attr('opacity', 1);

	// Center text
	g.append('text')
		.attr('text-anchor', 'middle')
		.attr('dy', '-0.1em')
		.style('font-size', '22px')
		.style('font-weight', '700')
		.style('fill', '#4a4540')
		.text(`${data.find((d) => d.label.includes('Offers'))?.pct || 73}%`);

	g.append('text')
		.attr('text-anchor', 'middle')
		.attr('dy', '1.3em')
		.style('font-size', '10px')
		.style('fill', '#8a8580')
		.text('offer training');
}

// ── Dot plot ─────────────────────────────────────────────

const DOT_W = 360;
const DOT_H = 280;
const DOT_MARGIN = { top: 20, right: 30, bottom: 40, left: 50 };

function renderDotPlot(container, data) {
	const svg = ensureSvg(container)
		.attr('viewBox', `0 0 ${DOT_W} ${DOT_H}`)
		.attr('preserveAspectRatio', 'xMidYMid meet');

	svg.selectAll('*').remove();

	const defs = svg.append('defs');
	const filterUrl = createCrayonFilter(defs, {
		id: 'crayon-training-dots', baseFrequency: 0.04, seed: 14, scale: 2.5,
	});

	const chartW = DOT_W - DOT_MARGIN.left - DOT_MARGIN.right;
	const chartH = DOT_H - DOT_MARGIN.top - DOT_MARGIN.bottom;

	const sorted = [...data].sort((a, b) => a.training_frequency_years - b.training_frequency_years);

	const xScale = d3.scaleLinear()
		.domain([0, d3.max(sorted, (d) => d.training_frequency_years) + 1])
		.range([0, chartW]);

	const yScale = d3.scaleBand()
		.domain(sorted.map((d) => d.company_id))
		.range([0, chartH])
		.padding(0.35);

	const g = svg.append('g')
		.attr('transform', `translate(${DOT_MARGIN.left}, ${DOT_MARGIN.top})`);

	// Grid lines
	g.append('g').attr('class', 'grid-lines')
		.selectAll('line').data(xScale.ticks(5)).join('line')
		.attr('x1', (d) => xScale(d)).attr('x2', (d) => xScale(d))
		.attr('y1', 0).attr('y2', chartH)
		.attr('stroke', THEME.colors.neutral).attr('stroke-width', 0.5)
		.attr('stroke-dasharray', '2 2').attr('opacity', 0.4);

	// Connector lines
	g.selectAll('.dot-line')
		.data(sorted).join('line')
		.attr('class', 'dot-line')
		.attr('x1', 0)
		.attr('x2', (d) => xScale(d.training_frequency_years))
		.attr('y1', (d) => yScale(d.company_id) + yScale.bandwidth() / 2)
		.attr('y2', (d) => yScale(d.company_id) + yScale.bandwidth() / 2)
		.attr('stroke', THEME.colors.neutral)
		.attr('stroke-width', 1)
		.attr('stroke-dasharray', '3 2')
		.attr('opacity', 0.5);

	// Dots
	g.selectAll('.dot-circle')
		.data(sorted).join('circle')
		.attr('class', 'dot-circle')
		.attr('cx', (d) => xScale(d.training_frequency_years))
		.attr('cy', (d) => yScale(d.company_id) + yScale.bandwidth() / 2)
		.attr('r', 0)
		.attr('fill', THEME.colors.nepal)
		.attr('stroke', THEME.colors.maleStroke)
		.attr('stroke-width', 1.5)
		.attr('filter', filterUrl)
		.transition().delay((d, i) => i * 50).duration(500).ease(d3.easeCubicOut)
		.attr('r', 6);

	// Value labels
	g.selectAll('.dot-value')
		.data(sorted).join('text')
		.attr('class', 'dot-value')
		.attr('x', (d) => xScale(d.training_frequency_years) + 10)
		.attr('y', (d) => yScale(d.company_id) + yScale.bandwidth() / 2)
		.attr('dy', '0.35em')
		.style('font-size', '10px').style('fill', '#6b6b6b')
		.text((d) => `${d.training_frequency_years}y`)
		.attr('opacity', 0)
		.transition().delay((d, i) => i * 50 + 300).duration(300).attr('opacity', 1);

	// X axis label
	g.append('text')
		.attr('x', chartW / 2).attr('y', chartH + 30)
		.attr('text-anchor', 'middle')
		.style('font-size', '11px').style('font-weight', '600').style('fill', '#6b6b6b')
		.text('Training Frequency (years)');
}

// ── Chart factory ────────────────────────────────────────

export function createTrainingCharts(container) {
	return createChart({
		container,
		resize() { },

		render(data) {
			if (!data) return;
			const { donut, frequency } = data;

			const donutEl = document.getElementById('training-donut');
			const dotEl = document.getElementById('training-dotplot');

			if (donutEl && donut) renderDonut(donutEl, donut);
			if (dotEl && frequency) renderDotPlot(dotEl, frequency);
		},
	});
}
