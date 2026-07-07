/**
 * charts/challenges-bubble.js
 * ─────────────────────────────────────────────────────────
 * Migrated from original script.js lines 1464–1613 ("CHALLENGES —
 * CRAYON-DRAWN BUBBLE CHART"). Data was inline in the original (not
 * fetched) — kept that way here rather than inventing a JSON file that
 * doesn't exist.
 */

/* global d3 */
import * as d3 from 'd3';
import { createChart } from './chart-base.js';
import { createCrayonFilter } from '../utils/svg-filters.js';
import { ensureSvg } from '../utils/dom.js';
import { THEME } from '../config.js';

const DATA = [
	{ challenge: 'Skilled workforce shortage', company_count: 3 },
	{ challenge: 'AI over-reliance', company_count: 4 },
	{ challenge: 'Access to funding', company_count: 2 },
	{ challenge: 'Brain drain abroad', company_count: 2 },
	{ challenge: 'Customer trust in digital', company_count: 2 },
	{ challenge: 'Foreign exchange restrictions', company_count: 2 },
	{ challenge: 'Government regulations', company_count: 2 },
	{ challenge: 'Market competition', company_count: 2 },
	{ challenge: 'Political instability', company_count: 2 },
	{ challenge: 'Talent retention', company_count: 2 },
	{ challenge: 'Distribution costs', company_count: 1 },
	{ challenge: 'Regaining customers', company_count: 1 },
	{ challenge: 'Regulatory compliance', company_count: 1 },
	{ challenge: 'Stakeholder buy-in', company_count: 1 },
	{ challenge: 'Technical evolution', company_count: 1 },
];

const PALETTE = THEME.colors.bubblePalette;
const STROKE_PALETTE = THEME.colors.bubbleStrokePalette;

export function createChallengesBubble(container) {
	return createChart({
		container,
		resize() { },

		render() {
			const root = d3.pack().size([600, 600]).padding(6)(
				d3.hierarchy({ children: DATA }).sum((d) => d.company_count || 0)
			);
			const leaves = root.leaves();

			const svg = ensureSvg(this.node())
				.attr('viewBox', '0 0 600 600')
				.attr('preserveAspectRatio', 'xMidYMid meet');

			const defs = svg.append('defs');
			createCrayonFilter(defs, { id: 'crayon-edge-challenges', baseFrequency: 0.04, seed: 2, scale: 4 });

			const nodes = svg.selectAll('.bubble-node')
				.data(leaves)
				.join('g')
				.attr('class', 'bubble-node')
				.attr('transform', (d) => `translate(${d.x}, ${d.y})`);

			nodes.append('circle')
				.attr('class', 'bubble-circle')
				.attr('r', 0)
				.attr('fill', (d, i) => PALETTE[i % PALETTE.length])
				.attr('stroke', (d, i) => STROKE_PALETTE[i % STROKE_PALETTE.length])
				.attr('filter', 'url(#crayon-edge-challenges)')
				.transition().delay((d, i) => i * 60).duration(700).ease(d3.easeCubicOut)
				.attr('r', (d) => d.r);

			nodes.each(function(d, idx) {
				const node = d3.select(this);
				const r = d.r;
				if (r < 20) return;

				const words = d.data.challenge.split(/\s+/);
				const fontSize = Math.max(8, Math.min(13, r * 0.30));
				const lineHeight = fontSize * 1.25;
				const maxWidth = r * 1.5;
				const lines = [];
				let currentLine = '';

				words.forEach((word) => {
					const testLine = currentLine ? `${currentLine} ${word}` : word;
					if (testLine.length * fontSize * 0.55 > maxWidth && currentLine) {
						lines.push(currentLine);
						currentLine = word;
					} else {
						currentLine = testLine;
					}
				});
				if (currentLine) lines.push(currentLine);

				const totalHeight = lines.length * lineHeight;
				const startY = -totalHeight / 2 + lineHeight / 2;

				lines.forEach((line, i) => {
					node.append('text')
						.attr('class', 'bubble-label')
						.attr('y', startY + i * lineHeight)
						.attr('dy', '0.35em')
						.style('font-size', `${fontSize}px`)
						.text(line)
						.attr('opacity', 0)
						.transition().delay(idx * 60 + 400).duration(400).attr('opacity', 1);
				});
			});
		},
	});
}
