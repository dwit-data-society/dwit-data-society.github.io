/**
 * charts/hiring-priorities.js
 * ─────────────────────────────────────────────────────────
 * Migrated from original script.js lines 699–1240 ("HIRING PRIORITIES —
 * INTERACTIVE QUIZ + STACKED BAR").
 *
 * Structure: init() builds the draggable rank quiz immediately (no data
 * needed). The stacked bar chart is genuinely lazy — it only fetches
 * data/hiring_priorities.json once the user submits their ranking, exactly
 * like the original. That's why this chart's `render()` is a no-op; there's
 * nothing to eagerly draw before the user interacts.
 */

/* global d3 */
import * as d3 from 'd3';
import { createChart } from './chart-base.js';
import { ensureSvg } from '../utils/dom.js';
import { loadJSON } from '../utils/load-data.js';
import { THEME } from '../config.js';

// Ranking scale: raw_rank runs 1–5 where 5 = highest priority and 1 = lowest.
// Ordering the criteria by their average raw_rank (most → least valued):
//   Passion 3.73, Technical 3.29, Soft skills 3.14, Experience 2.13.
// For intern roles, companies prioritise passion over formal experience.
const CORRECT_ORDER = ['Passion', 'Technical', 'Soft skills', 'Experience'];
// Starting order shown to the reader — deliberately not the correct one.
const INITIAL_ORDER = ['Experience', 'Soft skills', 'Technical', 'Passion'];
const PAPER_FILL = THEME.colors.paperFill;

// ── Torn-edge card path generator (private to this chart for now) ──
function tornEdgePts(x1, y1, x2, y2, seed, amplitude, segments) {
	const pts = [];
	const dx = x2 - x1;
	const dy = y2 - y1;
	const len = Math.sqrt(dx * dx + dy * dy);
	const nx = -dy / len;
	const ny = dx / len;
	for (let i = 0; i <= segments; i++) {
		const t = i / segments;
		const bx = x1 + dx * t;
		const by = y1 + dy * t;
		const s = seed + i * 1.9;
		const jag = Math.sin(s * 0.8) * amplitude * 0.5
			+ Math.cos(s * 2.1 + 2) * amplitude * 0.3
			+ Math.sin(s * 4.5 + 5) * amplitude * 0.2;
		pts.push({ x: bx + nx * jag, y: by + ny * jag });
	}
	return pts;
}

function tornCardPath(idx) {
	const vbW = 400;
	const vbH = 60;
	const seed = idx * 23 + 3;
	const amp = 2.5;
	const segs = 40;
	const inset = 2;
	const x0 = inset, y0 = inset, x1 = vbW - inset, y1 = vbH - inset;

	const pts = [
		...tornEdgePts(x0, y0, x1, y0, seed, amp, segs),
		...tornEdgePts(x1, y0, x1, y1, seed + 30, amp, 8),
		...tornEdgePts(x1, y1, x0, y1, seed + 60, amp, segs),
		...tornEdgePts(x0, y1, x0, y0, seed + 90, amp, 8),
	];

	let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
	for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
	d += ' Z';
	return { d, vbW, vbH };
}

export function createHiringPriorities(container, options = {}) {
	const {
		rankListId = 'rank-list',
		submitBtnId = 'submit-ranking',
		quizId = 'hiring-quiz',
		dotplotWrapId = 'dotplot-wrap',
		stackbarChartId = 'stackbar-chart',
		dataUrl = 'src/data/hiring_priorities.json',
	} = options;

	let rankList, submitBtn;
	let submitted = false;
	let dragSrc = null;
	let placeholder = null;
	let touchClone = null;
	let touchSrc = null;

	function buildRankItems() {
		rankList.innerHTML = '';
		INITIAL_ORDER.forEach((label, i) => {
			const item = document.createElement('div');
			item.className = 'rank-item';
			item.draggable = true;
			item.dataset.label = label;
			item.innerHTML = `
        <span class="rank-item__number">${i + 1}</span>
        <span class="rank-item__label">${label}</span>
        <span class="rank-item__handle">⠿</span>
      `;
			rankList.appendChild(item);
		});
		injectRankPaperSVGs();
		attachDragListeners();
	}

	function injectRankPaperSVGs() {
		const NS = 'http://www.w3.org/2000/svg';
		const items = rankList.querySelectorAll('.rank-item');

		items.forEach((item, idx) => {
			const { d, vbW, vbH } = tornCardPath(idx);
			const svg = document.createElementNS(NS, 'svg');
			svg.classList.add('rank-item__paper-svg');
			svg.setAttribute('preserveAspectRatio', 'none');
			svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);

			const filterId = `rank-paper-${idx}`;
			const defs = document.createElementNS(NS, 'defs');
			const filter = document.createElementNS(NS, 'filter');
			filter.id = filterId;
			filter.setAttribute('x', '-5%');
			filter.setAttribute('y', '-10%');
			filter.setAttribute('width', '110%');
			filter.setAttribute('height', '120%');

			const turb = document.createElementNS(NS, 'feTurbulence');
			turb.setAttribute('type', 'fractalNoise');
			turb.setAttribute('baseFrequency', '0.04');
			turb.setAttribute('numOctaves', '3');
			turb.setAttribute('seed', String(idx * 17 + 11));
			turb.setAttribute('result', 'turb');
			filter.appendChild(turb);

			const disp = document.createElementNS(NS, 'feDisplacementMap');
			disp.setAttribute('in', 'SourceGraphic');
			disp.setAttribute('in2', 'turb');
			disp.setAttribute('scale', '1.5');
			disp.setAttribute('xChannelSelector', 'R');
			disp.setAttribute('yChannelSelector', 'G');
			filter.appendChild(disp);

			defs.appendChild(filter);
			svg.appendChild(defs);

			const path = document.createElementNS(NS, 'path');
			path.setAttribute('d', d);
			path.setAttribute('fill', PAPER_FILL);
			path.setAttribute('stroke', '#d6cdb8');
			path.setAttribute('stroke-width', '0.5');
			path.setAttribute('filter', `url(#${filterId})`);
			svg.appendChild(path);

			item.insertBefore(svg, item.firstChild);
		});
	}

	// ── Drag and drop ──
	// The interaction shows a live insertion placeholder: a dashed gap that
	// follows the pointer to the slot where the card will land, then is
	// replaced by the card on drop. The dragged card is pulled out of the
	// flow while dragging so the surrounding cards slide to make room.
	function attachDragListeners() {
		// Container-level listeners track the pointer across the whole list,
		// not just over a single card — that's what lets the gap follow smoothly.
		rankList.addEventListener('dragover', handleListDragOver);
		rankList.addEventListener('drop', handleListDrop);

		rankList.querySelectorAll('.rank-item').forEach((item) => {
			item.addEventListener('dragstart', handleDragStart);
			item.addEventListener('dragend', handleDragEnd);
			item.addEventListener('touchstart', handleTouchStart, { passive: false });
			item.addEventListener('touchmove', handleTouchMove, { passive: false });
			item.addEventListener('touchend', handleTouchEnd);
		});
	}

	/** A dashed gap matching the dragged card's height, marking the drop slot. */
	function makePlaceholder(refItem) {
		const ph = document.createElement('div');
		ph.className = 'rank-placeholder';
		ph.style.height = `${refItem.offsetHeight}px`;
		return ph;
	}

	/** Which card the pointer currently sits above — null means "after the last". */
	function getDragAfterElement(y) {
		const items = [...rankList.querySelectorAll('.rank-item:not(.dragging)')];
		let closest = { offset: -Infinity, element: null };
		for (const child of items) {
			const box = child.getBoundingClientRect();
			const offset = y - box.top - box.height / 2;
			if (offset < 0 && offset > closest.offset) closest = { offset, element: child };
		}
		return closest.element;
	}

	/** Move the placeholder to the slot implied by pointer position `y`. */
	function positionPlaceholder(y) {
		if (!placeholder) return;
		const after = getDragAfterElement(y);
		if (after == null) rankList.appendChild(placeholder);
		else rankList.insertBefore(placeholder, after);
	}

	/** Drop the dragged card where the placeholder rests, then clean up. */
	function commitDrop(item) {
		if (placeholder && placeholder.parentNode) {
			rankList.insertBefore(item, placeholder);
			placeholder.remove();
		}
		placeholder = null;
		item.classList.remove('dragging');
		item.style.display = '';
		updateNumbers();
	}

	function handleDragStart(e) {
		if (submitted) { e.preventDefault(); return; }
		dragSrc = this;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', '');

		placeholder = makePlaceholder(this);
		rankList.insertBefore(placeholder, this.nextSibling);
		this.classList.add('dragging');
		// Defer hiding so the browser captures the drag image first.
		setTimeout(() => { if (dragSrc) dragSrc.style.display = 'none'; }, 0);
	}

	function handleListDragOver(e) {
		if (submitted || !dragSrc) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		positionPlaceholder(e.clientY);
	}

	function handleListDrop(e) {
		if (submitted || !dragSrc) return;
		e.preventDefault();
		commitDrop(dragSrc);
		dragSrc = null;
	}

	function handleDragEnd() {
		// Safety net if drop didn't fire (e.g. dropped outside the list).
		if (dragSrc) { commitDrop(dragSrc); dragSrc = null; }
	}

	// ── Touch support — same placeholder model, driven by a floating clone ──
	function moveTouchClone(touch) {
		if (!touchClone) return;
		touchClone.style.left = `${touch.clientX - touchClone.offsetWidth / 2}px`;
		touchClone.style.top = `${touch.clientY - 20}px`;
	}
	function handleTouchStart(e) {
		if (submitted) return;
		touchSrc = this;
		const touch = e.touches[0];
		touchClone = this.cloneNode(true);
		Object.assign(touchClone.style, {
			position: 'fixed', width: `${this.offsetWidth}px`, pointerEvents: 'none',
			opacity: '0.9', zIndex: '9999', boxShadow: '0 4px 14px rgba(26,24,20,0.18)',
		});
		document.body.appendChild(touchClone);
		moveTouchClone(touch);

		placeholder = makePlaceholder(this);
		rankList.insertBefore(placeholder, this.nextSibling);
		this.classList.add('dragging');
		this.style.display = 'none';
	}
	function handleTouchMove(e) {
		e.preventDefault();
		if (!touchClone) return;
		moveTouchClone(e.touches[0]);
		positionPlaceholder(e.touches[0].clientY);
	}
	function handleTouchEnd() {
		if (!touchClone || !touchSrc) return;
		commitDrop(touchSrc);
		touchSrc = null;
		touchClone.remove();
		touchClone = null;
	}

	function updateNumbers() {
		rankList.querySelectorAll('.rank-item').forEach((item, i) => {
			item.querySelector('.rank-item__number').textContent = i + 1;
		});
	}

	// ── Submit → reveal stacked bar ──
	async function handleSubmit() {
		if (submitted) return;
		submitted = true;

		const userOrder = [...rankList.querySelectorAll('.rank-item')].map((item) => item.dataset.label);

		rankList.querySelectorAll('.rank-item').forEach((item, i) => {
			item.draggable = false;
			item.style.cursor = 'default';
			item.classList.add(userOrder[i] === CORRECT_ORDER[i] ? 'correct' : 'incorrect');
		});

		await new Promise((r) => setTimeout(r, 1200));

		const quiz = document.getElementById(quizId);
		const dotplotWrap = document.getElementById(dotplotWrapId);
		if (quiz) {
			quiz.style.transition = 'opacity 0.5s ease';
			quiz.style.opacity = '0';
		}
		await new Promise((r) => setTimeout(r, 500));
		if (quiz) quiz.style.display = 'none';

		if (dotplotWrap) {
			dotplotWrap.style.display = 'block';
			dotplotWrap.style.opacity = '0';
			dotplotWrap.style.transition = 'opacity 0.5s ease';
			requestAnimationFrame(() => requestAnimationFrame(() => { dotplotWrap.style.opacity = '1'; }));
		}

		try {
			const data = await loadJSON(dataUrl);
			renderStackedBar(data.dots);
		} catch (err) {
			console.error('Hiring priorities stacked bar failed to load:', err);
			if (dotplotWrap) dotplotWrap.insertAdjacentHTML('beforeend', '<p class="viz-error">Couldn\u2019t load this chart\u2019s data.</p>');
		}
	}

	function renderStackedBar(dots) {
		// Criteria are listed top → bottom from most to least valued, matching
		// the survey averages (Passion highest, Experience lowest).
		const criteria = ['Passion', 'Technical', 'Soft skills', 'Experience'];
		// Stack from the strongest priority (raw_rank 5 = a company's top pick)
		// down to the weakest (1 = lowest). Keying on raw_rank keeps each
		// segment's colour and label honest: green = top priority.
		const stackOrder = [5, 4, 3, 2, 1];

		const distribution = {};
		criteria.forEach((c) => {
			distribution[c] = {};
			stackOrder.forEach((r) => { distribution[c][r] = 0; });
		});
		dots.forEach((d) => {
			if (distribution[d.criterion]) {
				distribution[d.criterion][d.raw_rank] = (distribution[d.criterion][d.raw_rank] || 0) + 1;
			}
		});

		const rankColors = THEME.colors.rankColors;
		const rankLabels = { 5: '#1 priority', 4: '#2', 3: '#3', 2: '#4', 1: '#5 (lowest)' };

		const margin = { top: 12, right: 30, bottom: 50, left: 100 };
		const svgWidth = 640;
		const barHeight = 38;
		const barGap = 16;
		const chartHeight = criteria.length * (barHeight + barGap) - barGap;
		const svgHeight = chartHeight + margin.top + margin.bottom;
		const chartWidth = svgWidth - margin.left - margin.right;

		const svgEl = ensureSvg(document.getElementById(stackbarChartId));
		svgEl.attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`).attr('preserveAspectRatio', 'xMidYMid meet');

		const defs = svgEl.append('defs');
		const cf = defs.append('filter')
			.attr('id', 'crayon-edge-stackbar').attr('x', '-5%').attr('y', '-15%')
			.attr('width', '110%').attr('height', '130%');
		cf.append('feTurbulence').attr('type', 'turbulence').attr('baseFrequency', 0.035)
			.attr('numOctaves', 4).attr('seed', 42).attr('result', 'turbulence');
		cf.append('feDisplacementMap').attr('in', 'SourceGraphic').attr('in2', 'turbulence')
			.attr('scale', 2.5).attr('xChannelSelector', 'R').attr('yChannelSelector', 'G');

		const g = svgEl.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

		const maxTotal = d3.max(criteria, (c) => stackOrder.reduce((sum, r) => sum + distribution[c][r], 0));
		const xScale = d3.scaleLinear().domain([0, maxTotal]).range([0, chartWidth]);

		criteria.forEach((criterion, ci) => {
			const y = ci * (barHeight + barGap);
			let xOffset = 0;

			g.append('text')
				.attr('class', 'stackbar-criterion').attr('x', -12).attr('y', y + barHeight / 2)
				.attr('dy', '0.35em').attr('text-anchor', 'end').text(criterion)
				.attr('opacity', 0).transition().delay(ci * 80).duration(400).attr('opacity', 1);

			stackOrder.forEach((rank, ri) => {
				const count = distribution[criterion][rank];
				if (count === 0) return;
				const segW = xScale(count);
				const segX = xScale(xOffset);

				g.append('rect')
					.attr('class', 'stackbar-segment').attr('x', segX).attr('y', y)
					.attr('width', 0).attr('height', barHeight).attr('rx', 2).attr('ry', 2)
					.attr('fill', rankColors[rank].fill).attr('stroke', rankColors[rank].stroke)
					.attr('filter', 'url(#crayon-edge-stackbar)')
					.transition().delay(ci * 100 + ri * 60).duration(600).ease(d3.easeCubicOut)
					.attr('width', segW);

				if (segW > 22) {
					g.append('text')
						.attr('class', 'stackbar-count-label').attr('x', segX + segW / 2).attr('y', y + barHeight / 2)
						.attr('dy', '0.35em').text(count)
						.attr('opacity', 0).transition().delay(ci * 100 + ri * 60 + 350).duration(300).attr('opacity', 1);
				}
				xOffset += count;
			});
		});

		const legendY = chartHeight + 24;
		const legendSpacing = chartWidth / stackOrder.length;
		stackOrder.forEach((rank, i) => {
			const lx = i * legendSpacing;
			g.append('rect')
				.attr('x', lx).attr('y', legendY).attr('width', 12).attr('height', 12).attr('rx', 1)
				.attr('fill', rankColors[rank].fill).attr('stroke', rankColors[rank].stroke)
				.attr('stroke-width', 1).attr('stroke-opacity', 0.6).attr('filter', 'url(#crayon-edge-stackbar)')
				.attr('opacity', 0).transition().delay(600 + i * 60).duration(300).attr('opacity', 1);

			g.append('text')
				.attr('class', 'stackbar-legend-text').attr('x', lx + 16).attr('y', legendY + 6)
				.attr('dy', '0.35em').text(rankLabels[rank])
				.attr('opacity', 0).transition().delay(600 + i * 60).duration(300).attr('opacity', 1);
		});
	}

	return createChart({
		container,
		init() {
			rankList = document.getElementById(rankListId);
			submitBtn = document.getElementById(submitBtnId);
			if (!rankList || !submitBtn) return;
			buildRankItems();
			submitBtn.addEventListener('click', handleSubmit);
		},
		resize() { },
		render() { },
	});
}
