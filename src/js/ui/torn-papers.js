/**
 * ui/torn-papers.js — torn-paper SVG backgrounds behind scrolly step text.
 */

const NS = 'http://www.w3.org/2000/svg';
const PAPER_FILL = '#faf6ee';
const FIBER_COLOR = '#e2d8c6';
const LINE_COLOR = '#d6cdb8';

function tornEdge(x1, y1, x2, y2, seed, amplitude, segments) {
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
		const s = seed + i * 1.7;
		const jag =
			Math.sin(s * 0.9) * amplitude * 0.6 +
			Math.cos(s * 1.8 + 3) * amplitude * 0.3 +
			Math.sin(s * 3.2 + 7) * amplitude * 0.15 +
			(Math.sin(s * 7.1) > 0.5 ? amplitude * 0.25 : 0);

		pts.push({ x: bx + nx * jag, y: by + ny * jag });
	}
	return pts;
}

export function initTornPapers() {
	const steps = document.querySelectorAll('.step__content');
	if (!steps.length) return;

	steps.forEach((stepContent, idx) => {
		const svg = document.createElementNS(NS, 'svg');
		svg.classList.add('step__paper-svg');
		svg.setAttribute('preserveAspectRatio', 'none');

		const vbW = 400;
		const vbH = 500;
		svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);

		const defs = document.createElementNS(NS, 'defs');
		const filterId = `torn-paper-${idx}`;
		const filter = document.createElementNS(NS, 'filter');
		filter.id = filterId;
		filter.setAttribute('x', '-3%');
		filter.setAttribute('y', '-3%');
		filter.setAttribute('width', '106%');
		filter.setAttribute('height', '106%');

		const turb = document.createElementNS(NS, 'feTurbulence');
		turb.setAttribute('type', 'fractalNoise');
		turb.setAttribute('baseFrequency', '0.03');
		turb.setAttribute('numOctaves', '4');
		turb.setAttribute('seed', String(idx * 13 + 5));
		turb.setAttribute('result', 'turb');
		filter.appendChild(turb);

		const disp = document.createElementNS(NS, 'feDisplacementMap');
		disp.setAttribute('in', 'SourceGraphic');
		disp.setAttribute('in2', 'turb');
		disp.setAttribute('scale', '1.8');
		disp.setAttribute('xChannelSelector', 'R');
		disp.setAttribute('yChannelSelector', 'G');
		filter.appendChild(disp);

		defs.appendChild(filter);
		svg.appendChild(defs);

		const seed = idx * 31 + 7;
		const amp = 6;
		const segs = 60;
		const inset = 8;
		const x0 = inset;
		const y0 = inset;
		const x1 = vbW - inset;
		const y1 = vbH - inset;

		const topEdge = tornEdge(x0, y0, x1, y0, seed, amp, segs);
		const rightEdge = tornEdge(x1, y0, x1, y1, seed + 50, amp, segs);
		const bottomEdge = tornEdge(x1, y1, x0, y1, seed + 100, amp, segs);
		const leftEdge = tornEdge(x0, y1, x0, y0, seed + 150, amp, segs);

		const allPts = [...topEdge, ...rightEdge, ...bottomEdge, ...leftEdge];
		let d = `M ${allPts[0].x.toFixed(2)},${allPts[0].y.toFixed(2)}`;
		for (let i = 1; i < allPts.length; i++) {
			d += ` L ${allPts[i].x.toFixed(2)},${allPts[i].y.toFixed(2)}`;
		}
		d += ' Z';

		const paperPath = document.createElementNS(NS, 'path');
		paperPath.setAttribute('d', d);
		paperPath.setAttribute('fill', PAPER_FILL);
		paperPath.setAttribute('stroke', 'none');
		paperPath.setAttribute('filter', `url(#${filterId})`);
		svg.appendChild(paperPath);

		const lineSpacing = 22;
		const lineStartY = y0 + 30;
		const lineEndY = y1 - 15;
		for (let ly = lineStartY; ly < lineEndY; ly += lineSpacing) {
			const line = document.createElementNS(NS, 'line');
			line.setAttribute('x1', x0 + 20);
			line.setAttribute('y1', ly);
			line.setAttribute('x2', x1 - 20);
			line.setAttribute('y2', ly);
			line.setAttribute('stroke', LINE_COLOR);
			line.setAttribute('stroke-opacity', '0.25');
			line.setAttribute('stroke-width', '0.5');
			svg.appendChild(line);
		}

		const fiberCount = 18 + idx * 3;
		for (let f = 0; f < fiberCount; f++) {
			const fx = x0 + 15 + Math.sin(f * 3.7 + seed) * (x1 - x0 - 30) * 0.5 + (x1 - x0 - 30) * 0.5;
			const fy = y0 + 15 + Math.cos(f * 2.3 + seed) * (y1 - y0 - 30) * 0.5 + (y1 - y0 - 30) * 0.5;
			const fLen = 3 + Math.sin(f * 5.1) * 4;
			const fAngle = (f * 37 + seed * 7) % 180;
			const rad = (fAngle * Math.PI) / 180;

			const fiber = document.createElementNS(NS, 'line');
			fiber.setAttribute('x1', fx);
			fiber.setAttribute('y1', fy);
			fiber.setAttribute('x2', fx + Math.cos(rad) * fLen);
			fiber.setAttribute('y2', fy + Math.sin(rad) * fLen);
			fiber.setAttribute('stroke', FIBER_COLOR);
			fiber.setAttribute('stroke-opacity', String(0.15 + Math.sin(f) * 0.1));
			fiber.setAttribute('stroke-width', '0.4');
			svg.appendChild(fiber);
		}

		stepContent.insertBefore(svg, stepContent.firstChild);
	});
}
