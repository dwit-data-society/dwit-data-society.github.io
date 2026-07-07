/**
 * main.js
 * ─────────────────────────────────────────────────────────
 * Single entry point. Boots every chart and UI component in an explicit
 * order, with consistent error handling for each.
 *
 * All charts follow the same lifecycle:
 *   chart = createXxx(container).init()
 *   chart.resize().render(data)
 *
 * Data loading is separated from rendering so that failures surface with
 * a user-visible error state instead of a silently blank chart.
 */

/* global scrollama */
// scrollama is loaded globally via the CDN <script> tag in index.html —
// see note in utils/dom.js for why d3-family libraries are referenced as
// globals rather than imported in this project.

import { watchChart, debounce } from './utils/responsive.js';

// ── UI components ──
import { initLanding } from './ui/landing.js';
import { initPaperTexture } from './ui/paper-texture.js';
import { initTornPapers } from './ui/torn-papers.js';

// ── Charts ──
import { createWorkmodeBar } from './charts/workmode-bar.js';
import { createCompanyGrid, loadCompanyGridData } from './charts/company-grid.js';
import { createHiringPriorities } from './charts/hiring-priorities.js';
import { createSalaryExperienceLine, loadSalaryData } from './charts/salary-experience-line.js';
import { createChallengesBubble } from './charts/challenges-bubble.js';
import { createGenderDisparityBar } from './charts/gender-disparity-bar.js';
import { createCompanyMaturityScatter, loadMaturityData } from './charts/company-maturity-scatter.js';
import { createTrainingCharts, loadTrainingData } from './charts/training-charts.js';

/** Show a user-facing error state inside a container. */
function showError(container, label = 'this chart') {
	if (!container) return;
	container.insertAdjacentHTML(
		'beforeend',
		`<p class="viz-error">Couldn\u2019t load ${label}\u2019s data.</p>`
	);
}

async function boot() {
	// ── Paper texture (canvas noise on body::before) ─────
	try { initPaperTexture(); } catch (e) { console.error('Paper texture failed:', e); }

	// ── Torn paper backgrounds on scroll steps ──────────
	try { initTornPapers(); } catch (e) { console.error('Torn papers failed:', e); }

	// ── Landing animation (falling papers + text reveal) ─
	try { initLanding(); } catch (e) { console.error('Landing animation failed:', e); }

	// ── Work Mode drag bar ──────────────────────────────
	// Self-contained: no external data file, so it can init synchronously.
	try {
		const workmodeEl = document.getElementById('workmode-bar-wrap');
		if (workmodeEl) {
			const workmodeBar = createWorkmodeBar(workmodeEl).init();
			workmodeBar.resize().render();
			watchChart(workmodeBar);
		}
	} catch (e) { console.error('Workmode bar failed:', e); }

	// ── Company grid (scrollytelling) ───────────────────
	const gridEl = document.getElementById('viz');
	if (gridEl) {
		const companyGrid = createCompanyGrid(gridEl).init();
		try {
			const companies = await loadCompanyGridData();
			companyGrid.resize().render(companies);

			const scroller = scrollama();
			scroller
				.setup({ step: '.step', offset: 0.5, progress: true })
				.onStepEnter(({ index, element, direction }) => {
					document.querySelectorAll('.step').forEach((el) => el.classList.remove('is-active'));
					element.classList.add('is-active');
					companyGrid.stepEnter(index, direction);
				})
				.onStepExit(({ index, direction }) => companyGrid.stepExit(index, direction))
				.onStepProgress(({ index, progress }) => companyGrid.stepProgress(index, progress));

			window.addEventListener('resize', debounce(() => scroller.resize(), 150));
		} catch (err) {
			console.error('Company grid failed to load:', err);
			showError(gridEl, 'company grid');
		}
	}

	// ── Hiring Priorities (quiz + stacked bar) ──────────
	try {
		const hiringEl = document.getElementById('hiring-section');
		if (hiringEl) {
			createHiringPriorities(hiringEl).init().resize().render();
		}
	} catch (e) { console.error('Hiring priorities failed:', e); }

	// ── Salary-Experience line chart ────────────────────
	try {
		const salaryEl = document.getElementById('salary-line');
		if (salaryEl) {
			const salaryChart = createSalaryExperienceLine(salaryEl).init();
			const salaryData = await loadSalaryData();
			salaryChart.resize().render(salaryData);
		}
	} catch (err) {
		console.error('Salary chart failed:', err);
		const el = document.getElementById('salary-line');
		if (el) showError(el.parentElement, 'salary');
	}

	// ── Challenges bubble chart ─────────────────────────
	try {
		const challengesEl = document.getElementById('challenges-bubbles');
		if (challengesEl) {
			createChallengesBubble(challengesEl).init().resize().render();
		}
	} catch (e) { console.error('Challenges bubble failed:', e); }

	// ── Gender disparity bar chart ──────────────────────
	try {
		const genderEl = document.getElementById('gender-chart');
		if (genderEl) {
			createGenderDisparityBar(genderEl).init().resize().render();
		}
	} catch (e) { console.error('Gender disparity failed:', e); }

	// ── Company maturity scatter plots ──────────────────
	try {
		const maturityEl = document.getElementById('maturity-scatter');
		if (maturityEl) {
			const maturityChart = createCompanyMaturityScatter(maturityEl).init();
			const maturityData = await loadMaturityData();
			maturityChart.resize().render(maturityData);
		}
	} catch (err) {
		console.error('Maturity scatter failed:', err);
		const el = document.getElementById('maturity-scatter');
		if (el) showError(el.parentElement, 'maturity scatter');
	}

	// ── Training charts (donut + dot plot) ──────────────
	try {
		const trainingEl = document.getElementById('training-viz');
		if (trainingEl) {
			const trainingChart = createTrainingCharts(trainingEl).init();
			const trainingData = await loadTrainingData();
			trainingChart.resize().render(trainingData);
		}
	} catch (err) {
		console.error('Training charts failed:', err);
		const el = document.getElementById('training-viz');
		if (el) showError(el, 'training');
	}

	console.log('boot() complete — all charts initialized');
}

boot();
