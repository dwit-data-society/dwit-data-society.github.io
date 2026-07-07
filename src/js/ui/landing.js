/**
 * ui/landing.js — falling paper documents on the title screen.
 * Migrated from the original script.js LANDING section.
 */

import { THEME } from '../config.js';

const NS = 'http://www.w3.org/2000/svg';
const BORDER = THEME.colors.neutral;
const LINE_CLR = THEME.colors.neutral;
const FILLS = THEME.colors.landingFills;

const PAPERS = [
	{ type: 'ruled', vbW: 140, vbH: 198, cssW: 15, left: -3, top: 5, rot: -7, sRot: -18, delay: 0, dur: 1600, z: 1 },
	{ type: 'grid', vbW: 128, vbH: 181, cssW: 13.5, left: 15, top: 22, rot: 5, sRot: 16, delay: 200, dur: 1400, z: 3 },
	{ type: 'plain', vbW: 118, vbH: 167, cssW: 12, left: 55, top: 2, rot: -11, sRot: -24, delay: 100, dur: 1500, z: 2 },
	{ type: 'torn-bottom', vbW: 150, vbH: 212, cssW: 14.5, left: 34, top: 32, rot: 3, sRot: -8, delay: 350, dur: 1300, z: 5 },
	{ type: 'ruled', vbW: 158, vbH: 224, cssW: 16, left: 70, top: 10, rot: -5, sRot: 10, delay: 160, dur: 1700, z: 4 },
	{ type: 'grid', vbW: 112, vbH: 162, cssW: 12, left: 46, top: 55, rot: 9, sRot: 22, delay: 440, dur: 1200, z: 6 },
	{ type: 'plain', vbW: 144, vbH: 200, cssW: 14, left: 82, top: 42, rot: -9, sRot: -4, delay: 260, dur: 1450, z: 7 },
	{ type: 'torn-top', vbW: 152, vbH: 218, cssW: 14.5, left: 5, top: 50, rot: 6, sRot: -12, delay: 500, dur: 1350, z: 8 },
	{ type: 'ruled', vbW: 124, vbH: 178, cssW: 13, left: 60, top: 60, rot: -4, sRot: 14, delay: 320, dur: 1550, z: 9 },
	{ type: 'grid', vbW: 164, vbH: 232, cssW: 16, left: 24, top: -4, rot: 10, sRot: 4, delay: 50, dur: 1640, z: 10 },
];

function makePaper(p, idx) {
	const w = p.vbW;
	const h = p.vbH;
	const fill = FILLS[idx % FILLS.length];

	const svg = document.createElementNS(NS, 'svg');
	svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
	svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
	svg.style.cssText = 'display:block;width:100%;height:100%';

	const defs = document.createElementNS(NS, 'defs');
	const filt = document.createElementNS(NS, 'filter');
	filt.id = `pc${idx}`;
	filt.setAttribute('x', '-5%');
	filt.setAttribute('y', '-5%');
	filt.setAttribute('width', '110%');
	filt.setAttribute('height', '110%');

	const turb = document.createElementNS(NS, 'feTurbulence');
	turb.setAttribute('type', 'turbulence');
	turb.setAttribute('baseFrequency', '0.04');
	turb.setAttribute('numOctaves', '4');
	turb.setAttribute('seed', String(idx * 7 + 3));
	turb.setAttribute('result', 'turb');

	const disp = document.createElementNS(NS, 'feDisplacementMap');
	disp.setAttribute('in', 'SourceGraphic');
	disp.setAttribute('in2', 'turb');
	disp.setAttribute('scale', '2');
	disp.setAttribute('xChannelSelector', 'R');
	disp.setAttribute('yChannelSelector', 'G');

	filt.append(turb, disp);
	defs.appendChild(filt);
	svg.appendChild(defs);

	const fRef = `url(#pc${idx})`;

	if (p.type === 'torn-bottom') {
		let d = `M 0,0 L ${w},0 L ${w},${h - 10} `;
		for (let x = w; x >= 0; x -= 5) {
			const jag = Math.sin(x * 0.8 + idx * 4) * 3.5 + Math.cos(x * 1.5 + idx * 2) * 2;
			d += `L ${Math.max(0, x)},${h - 10 + jag} `;
		}
		d += 'Z';
		const path = document.createElementNS(NS, 'path');
		path.setAttribute('d', d);
		path.setAttribute('fill', fill);
		path.setAttribute('stroke', BORDER);
		path.setAttribute('stroke-width', '0.75');
		path.setAttribute('filter', fRef);
		svg.appendChild(path);
	} else if (p.type === 'torn-top') {
		let d = '';
		for (let x = 0; x <= w; x += 5) {
			const jag = Math.sin(x * 0.7 + idx * 3) * 3 + Math.cos(x * 1.2 + idx * 5) * 2.5;
			d += (x === 0 ? 'M' : 'L') + ` ${x},${10 + jag} `;
		}
		d += `L ${w},${h} L 0,${h} Z`;
		const path = document.createElementNS(NS, 'path');
		path.setAttribute('d', d);
		path.setAttribute('fill', fill);
		path.setAttribute('stroke', BORDER);
		path.setAttribute('stroke-width', '0.75');
		path.setAttribute('filter', fRef);
		svg.appendChild(path);
	} else {
		const rect = document.createElementNS(NS, 'rect');
		rect.setAttribute('width', w);
		rect.setAttribute('height', h);
		rect.setAttribute('fill', fill);
		rect.setAttribute('stroke', BORDER);
		rect.setAttribute('stroke-width', '0.75');
		rect.setAttribute('filter', fRef);
		svg.appendChild(rect);
	}

	if (p.type === 'ruled' || p.type === 'torn-top' || p.type === 'torn-bottom') {
		const y0 = p.type === 'torn-top' ? 26 : 18;
		const y1 = p.type === 'torn-bottom' ? h - 18 : h - 12;
		for (let y = y0; y < y1; y += 10) {
			const ln = document.createElementNS(NS, 'line');
			ln.setAttribute('x1', '14');
			ln.setAttribute('y1', y);
			ln.setAttribute('x2', w - 14);
			ln.setAttribute('y2', y);
			ln.setAttribute('stroke', LINE_CLR);
			ln.setAttribute('stroke-opacity', '0.18');
			ln.setAttribute('stroke-width', '0.5');
			svg.appendChild(ln);
		}
	}

	if (p.type === 'grid') {
		for (let y = 14; y < h - 10; y += 11) {
			const ln = document.createElementNS(NS, 'line');
			ln.setAttribute('x1', '10');
			ln.setAttribute('y1', y);
			ln.setAttribute('x2', w - 10);
			ln.setAttribute('y2', y);
			ln.setAttribute('stroke', LINE_CLR);
			ln.setAttribute('stroke-opacity', '0.13');
			ln.setAttribute('stroke-width', '0.4');
			svg.appendChild(ln);
		}
		for (let x = 14; x < w - 10; x += 11) {
			const ln = document.createElementNS(NS, 'line');
			ln.setAttribute('x1', x);
			ln.setAttribute('y1', '10');
			ln.setAttribute('x2', x);
			ln.setAttribute('y2', h - 10);
			ln.setAttribute('stroke', LINE_CLR);
			ln.setAttribute('stroke-opacity', '0.13');
			ln.setAttribute('stroke-width', '0.4');
			svg.appendChild(ln);
		}
	}

	return svg;
}

export function initLanding() {
	const container = document.getElementById('landing-papers');
	if (!container) return;

	const sways = [8, -6, 10, -8, 5, -10, 7, -5, 9, -7];

	PAPERS.forEach((p, i) => {
		const el = document.createElement('div');
		el.className = 'landing__paper';
		el.style.left = `${p.left}%`;
		el.style.top = `${p.top}%`;
		el.style.width = `clamp(100px, ${p.cssW}vw, 260px)`;
		el.style.aspectRatio = `${p.vbW} / ${p.vbH}`;
		el.style.zIndex = p.z;

		el.appendChild(makePaper(p, i));
		container.appendChild(el);

		const wobble = (i % 2 === 0) ? 1.5 : -1.5;
		const drift = sways[i];

		el.animate([
			{ transform: `translate(0px, -120vh) rotate(${p.sRot}deg)`, opacity: 0 },
			{ opacity: 1, offset: 0.05 },
			{ transform: `translate(${drift}px, 8px) rotate(${p.rot + wobble}deg)`, opacity: 1, offset: 0.87 },
			{ transform: `translate(0px, 0px) rotate(${p.rot}deg)`, opacity: 1 },
		], {
			duration: p.dur,
			delay: p.delay,
			easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
			fill: 'forwards',
		});
	});

	const settle = Math.max(...PAPERS.map((paper) => paper.delay + paper.dur));

	setTimeout(() => document.getElementById('landing-kicker')?.classList.add('visible'), settle + 50);
	setTimeout(() => document.getElementById('landing-title')?.classList.add('visible'), settle + 250);
	setTimeout(() => document.getElementById('landing-subtitle')?.classList.add('visible'), settle + 700);
	setTimeout(() => document.getElementById('landing-scroll')?.classList.add('visible'), settle + 1200);
}
