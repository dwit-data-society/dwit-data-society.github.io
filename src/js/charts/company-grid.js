/**
 * charts/company-grid.js
 * ─────────────────────────────────────────────────────────
 * Migrated from original script.js lines 222–696 (the unlabeled section
 * right after "LANDING" — company-size grid / Nepal vs Abroad scrollytelling).
 *
 * WHAT CHANGED AND WHY:
 *
 * 1. State (`companies`, `currentStep`, `entryMap`, the rendered `groups`
 *    selection) is now private to this chart's closure. The original kept
 *    `companies` and `currentStep` as top-level `let`s shared with every
 *    other chart in the 2,740-line file, and stashed the rendered groups
 *    selection ON THE DOM NODE itself (`vizSvg.property('__groups__', ...)`)
 *    as a workaround for not having anywhere else to put it. Neither is
 *    needed once the chart owns its own state.
 *
 * 2. The scroll "beats" (transitionStep1, transitionStep2, snapToStep2,
 *    applyBeat3) are private functions inside this module, and are now
 *    reached through three public methods — stepEnter, stepExit,
 *    stepProgress — that match scrollama's callback shape exactly. This
 *    chart has NO scrollama-specific code in it; main.js wires scrollama
 *    events to these methods generically. That decoupling is what makes it
 *    possible to test or reuse this chart without scrollama at all.
 *
 * 3. Colors come from THEME (config.js) instead of reading CSS custom
 *    properties locally — same values, single source of truth.
 *
 * 4. Data loading goes through utils/load-data.js instead of an inline
 *    try/catch around Promise.all.
 *
 * NOTE ON RESIZE: this chart's layout is computed once from data (not from
 * container pixel size) and scales visually via SVG viewBox +
 * preserveAspectRatio — so unlike workmode-bar, there's no resize-induced
 * bug here. `resize()` is a deliberate no-op;
 */

import * as d3 from 'd3';
import { createChart } from './chart-base.js';
import { createCrayonFilter, addFillGrain } from '../utils/svg-filters.js';
import { loadAll } from '../utils/load-data.js';
import { THEME } from '../config.js';

const SCALE_FACTOR = 10;   // 1 rect = 10 employees
const RECT_SIZE = 6;
const RECT_GAP = 2;
const GRID_COLS = 5;
const COMPANY_GAP_X = 24;
const COMPANY_GAP_Y = 28;
const GAP_BETWEEN_SPLIT = 6;
const PAD = 10;

// ── Pure layout helpers — no chart state, easy to unit test in isolation ──

function computeInnerGrid(count) {
	if (count <= 0) return { cols: 0, rows: 0 };
	const cols = Math.max(1, Math.ceil(Math.sqrt(count * 1.2)));
	const rows = Math.max(1, Math.ceil(count / cols));
	return { cols, rows };
}

function companyFootprint(c) {
	const grid = computeInnerGrid(c.scaledTotal);
	const unifiedW = grid.cols * (RECT_SIZE + RECT_GAP) - RECT_GAP;
	const unifiedH = grid.rows * (RECT_SIZE + RECT_GAP) - RECT_GAP;

	let splitW = 0, splitH = 0;
	if (c.scaledAbroad > 0 && c.scaledNepal > 0) {
		const ng = computeInnerGrid(c.scaledNepal);
		const ag = computeInnerGrid(c.scaledAbroad);
		splitW = ng.cols * (RECT_SIZE + RECT_GAP) + GAP_BETWEEN_SPLIT
			+ ag.cols * (RECT_SIZE + RECT_GAP) - RECT_GAP;
		splitH = Math.max(
			ng.rows * (RECT_SIZE + RECT_GAP) - RECT_GAP,
			ag.rows * (RECT_SIZE + RECT_GAP) - RECT_GAP
		);
	}

	const w = Math.max(unifiedW, splitW);
	const h = Math.max(unifiedH, splitH) + 14; // + count label
	return { w, h, grid };
}

function computeLayout(companies) {
	const items = companies.map((c) => {
		const { w, h, grid } = companyFootprint(c);
		return { ...c, w, h, grid };
	});

	const columns = Array.from({ length: GRID_COLS }, () => []);
	items.forEach((item, i) => columns[i % GRID_COLS].push(item));

	let totalWidth = 0;
	const colMeta = columns.map((col) => {
		const maxW = d3.max(col, (d) => d.w) || 0;
		const x = totalWidth;
		totalWidth += maxW + COMPANY_GAP_X;
		return { x, maxW, col };
	});
	totalWidth -= COMPANY_GAP_X;

	const layout = [];
	let maxHeight = 0;
	colMeta.forEach(({ x, maxW, col }) => {
		let y = 0;
		col.forEach((item) => {
			layout.push({ ...item, x: x + (maxW - item.w) / 2, y });
			y += item.h + COMPANY_GAP_Y;
		});
		maxHeight = Math.max(maxHeight, y - COMPANY_GAP_Y);
	});

	return { layout, totalWidth, totalHeight: maxHeight };
}

export function createCompanyGrid(container, options = {}) {
	const {
		legendId = 'legend',
		duration = THEME.motion.duration,
		stagger = THEME.motion.reduced ? 0 : THEME.motion.stagger,
	} = options;

	// Private state — was global `let companies/currentStep/entryMap` before.
	let svg, groups;
	let currentStep = -1;

	function legend(visible) {
		const el = document.getElementById(legendId);
		if (el) el.classList.toggle('visible', visible);
	}

	// ── Scroll beats — private; reached only via stepEnter/stepExit/stepProgress ──

	function transitionStep1() {
		if (!groups) return;
		legend(false);
		groups.each(function (d, i) {
			const g = d3.select(this);
			g.transition().delay(i * stagger).duration(duration).ease(d3.easeCubicInOut).style('opacity', 1);
			g.selectAll('.emp-rect')
				.transition().delay(i * stagger).duration(duration).ease(d3.easeCubicInOut)
				.attr('x', (d) => d.ux).attr('y', (d) => d.uy)
				.attr('fill', THEME.colors.neutral).attr('opacity', 1);
			g.select('.company-count').attr('opacity', 1);
		});
	}

	function transitionStep2() {
		if (!groups) return;
		legend(true);
		groups.each(function (d, i) {
			const g = d3.select(this);
			g.transition().duration(duration / 2).ease(d3.easeCubicInOut).style('opacity', 1);
			g.selectAll('.emp-rect')
				.transition().delay(i * stagger).duration(duration).ease(d3.easeCubicInOut)
				.attr('x', (d) => d.sx).attr('y', (d) => d.sy)
				.attr('fill', (d) => (d.isNepal ? THEME.colors.nepal : THEME.colors.abroad))
				.attr('opacity', 1);
			g.select('.company-count').attr('opacity', 1);
		});
	}

	function snapToStep2() {
		if (!groups) return;
		legend(true);
		groups.each(function () {
			const g = d3.select(this);
			g.interrupt().style('opacity', 1);
			g.selectAll('.emp-rect').interrupt()
				.attr('x', (d) => d.sx).attr('y', (d) => d.sy)
				.attr('fill', (d) => (d.isNepal ? THEME.colors.nepal : THEME.colors.abroad))
				.attr('opacity', 1);
			g.select('.company-count').attr('opacity', 1);
		});
	}

	function applyBeat3(progress) {
		if (!groups) return;
		groups.each(function () {
			d3.select(this).selectAll('.emp-rect').each(function (d) {
				const rect = d3.select(this);
				const baseColor = d.isNepal ? THEME.colors.nepal : THEME.colors.abroad;
				if (d.isEntry) {
					rect.attr('fill', d3.interpolateRgb(baseColor, THEME.colors.accent)(progress)).attr('opacity', 1);
				} else {
					rect.attr('fill', baseColor).attr('opacity', 1 - progress * 0.65);
				}
			});
		});
	}

	const chart = createChart({
		container,

		init() {
			svg = d3.select(this.node()).select('svg').empty()
				? d3.select(this.node()).append('svg')
				: d3.select(this.node()).select('svg');
		},

		// Layout is content-driven (scales via viewBox), not container-driven —
		// intentionally a no-op. See README "does every chart need resize()?"
		resize() { },

		render(companies) {
			if (!companies) return;
			const { layout, totalWidth, totalHeight } = computeLayout(companies);

			svg.attr('viewBox', `0 0 ${totalWidth + PAD * 2} ${totalHeight + PAD * 2}`)
				.attr('preserveAspectRatio', 'xMidYMid meet');

			const defs = svg.append('defs');
			const cf = defs.append('filter')
				.attr('id', 'crayon-rect').attr('x', '-15%').attr('y', '-15%')
				.attr('width', '130%').attr('height', '130%');
			cf.append('feTurbulence')
				.attr('type', 'turbulence').attr('baseFrequency', 0.05).attr('numOctaves', 3)
				.attr('seed', 8).attr('result', 'warp');
			cf.append('feDisplacementMap')
				.attr('in', 'SourceGraphic').attr('in2', 'warp').attr('scale', 1.2)
				.attr('xChannelSelector', 'R').attr('yChannelSelector', 'G').attr('result', 'wobbled');
			addFillGrain(cf);

			const master = svg.append('g').attr('transform', `translate(${PAD}, ${PAD})`);

			// Visible immediately — the grid is the first thing the reader sees
			// when they scroll out of the landing, before any step text. It
			// rests in the neutral, unified state (step 1) until scrolling begins.
			groups = master.selectAll('.company-group')
				.data(layout, (d) => d.company_id)
				.join('g')
				.attr('class', 'company-group')
				.attr('transform', (d) => `translate(${d.x}, ${d.y})`)
				.style('opacity', 1);

			groups.append('g').attr('class', 'company-rects').attr('filter', 'url(#crayon-rect)');
			groups.append('text')
				.attr('class', 'company-count')
				.attr('x', (d) => d.w / 2).attr('y', (d) => d.h - 1)
				.text((d) => d.total_employees.toLocaleString());

			groups.each(function (companyData) {
				const rectsGroup = d3.select(this).select('.company-rects');
				const { grid, scaledTotal, scaledNepal, entrySquares } = companyData;

				const employees = [];
				for (let i = 0; i < scaledTotal; i++) {
					const isNepal = i < scaledNepal;
					const col = i % grid.cols;
					const row = Math.floor(i / grid.cols);
					employees.push({
						id: `${companyData.company_id}-${i}`,
						isNepal,
						isEntry: i < entrySquares,
						ux: col * (RECT_SIZE + RECT_GAP),
						uy: row * (RECT_SIZE + RECT_GAP),
						sx: 0, sy: 0,
					});
				}

				const nepalRects = employees.filter((e) => e.isNepal);
				const abroadRects = employees.filter((e) => !e.isNepal);
				const nepalGrid = computeInnerGrid(nepalRects.length || 1);
				nepalRects.forEach((e, i) => {
					e.sx = (i % nepalGrid.cols) * (RECT_SIZE + RECT_GAP);
					e.sy = Math.floor(i / nepalGrid.cols) * (RECT_SIZE + RECT_GAP);
				});
				if (abroadRects.length > 0) {
					const abroadGrid = computeInnerGrid(abroadRects.length);
					const offsetX = nepalGrid.cols * (RECT_SIZE + RECT_GAP) + GAP_BETWEEN_SPLIT;
					abroadRects.forEach((e, i) => {
						e.sx = offsetX + (i % abroadGrid.cols) * (RECT_SIZE + RECT_GAP);
						e.sy = Math.floor(i / abroadGrid.cols) * (RECT_SIZE + RECT_GAP);
					});
				}

				rectsGroup.selectAll('.emp-rect')
					.data(employees, (d) => d.id)
					.join('rect')
					.attr('class', 'emp-rect')
					.attr('x', (d) => d.ux).attr('y', (d) => d.uy)
					.attr('width', RECT_SIZE).attr('height', RECT_SIZE)
					.attr('rx', 1).attr('ry', 1)
					.attr('fill', THEME.colors.neutral);
			});
		},

		// ── Public, scrollama-shaped API — main.js forwards scroll events here ──

		update(progress, { index } = {}) {
			if (index === 2) applyBeat3(Math.min(1, progress / 0.33));
		},
	});

	// Extend with the semantic step methods scrollama callbacks map onto 1:1.
	chart.stepEnter = (index, direction) => {
		currentStep = index;
		if (index === 0) transitionStep1();
		else if (index === 1) (direction === 'up' ? snapToStep2() : transitionStep2());
		else if (index === 2 && direction === 'down') snapToStep2();
	};

	chart.stepExit = (index, direction) => {
		if (direction === 'down') {
			if (index === 1) snapToStep2();
			else if (index === 2) applyBeat3(1);
		} else {
			if (index === 2) snapToStep2();
		}
	};

	chart.stepProgress = (index, progress) => chart.update(progress, { index });

	chart.currentStep = () => currentStep;

	return chart;
}

/** Loads this chart's two data sources and shapes them the way render() expects. */
export async function loadCompanyGridData() {
	const { sizeData, entryData } = await loadAll({
		sizeData: { url: 'src/data/company_size.json' },
		entryData: { url: 'src/data/entry_level.json' },
	});

	const entryMap = new Map(entryData.map((d) => [d.company_id, d]));

	return sizeData.companies
		.sort((a, b) => b.total_employees - a.total_employees)
		.map((c) => {
			const entry = entryMap.get(c.company_id);
			return {
				...c,
				scaledTotal: Math.max(1, Math.round(c.total_employees / SCALE_FACTOR)),
				scaledNepal: Math.max(c.nepal_employees > 0 ? 1 : 0, Math.round(c.nepal_employees / SCALE_FACTOR)),
				scaledAbroad: Math.max(c.abroad_employees > 0 ? 1 : 0, Math.round(c.abroad_employees / SCALE_FACTOR)),
				entrySquares: entry ? entry.entry_squares : 0,
			};
		});
}
