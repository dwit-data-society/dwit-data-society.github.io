/**
 * utils/svg-filters.js
 * ─────────────────────────────────────────────────────────
 * The original script.js builds the same feTurbulence + feDisplacementMap
 * "crayon edge" filter from scratch 12 separate times — once per chart —
 * each with slightly different baseFrequency/scale values that don't seem
 * to be intentional (just copy-paste drift). This is the one place that
 * texture is now defined. Every chart should call this instead of
 * re-implementing it.
 *
 * Usage:
 *   import { createCrayonFilter } from '../utils/svg-filters.js';
 *   const defs = svg.append('defs');
 *   const filterUrl = createCrayonFilter(defs, { id: 'crayon-edge-gender', scale: 3 });
 *   rect.attr('filter', filterUrl);
 */

let autoId = 0;

/**
 * @param {d3.Selection} defs - a d3 selection of a <defs> element
 * @param {object} [opts]
 * @param {string} [opts.id] - explicit filter id (auto-generated if omitted)
 * @param {'turbulence'|'fractalNoise'} [opts.type='turbulence']
 * @param {number} [opts.baseFrequency=0.04]
 * @param {number} [opts.numOctaves=4]
 * @param {number} [opts.seed=1]
 * @param {number} [opts.scale=2] - displacement strength (higher = wobblier)
 * @returns {string} the `url(#id)` reference to hand to `.attr('filter', ...)`
 */
export function createCrayonFilter(defs, opts = {}) {
	const {
		id = `crayon-${autoId++}`,
		type = 'turbulence',
		baseFrequency = 0.04,
		numOctaves = 4,
		seed = 1,
		scale = 2,
	} = opts;

	const filter = defs.append('filter')
		.attr('id', id)
		.attr('x', '-10%')
		.attr('y', '-10%')
		.attr('width', '120%')
		.attr('height', '120%');

	filter.append('feTurbulence')
		.attr('type', type)
		.attr('baseFrequency', baseFrequency)
		.attr('numOctaves', numOctaves)
		.attr('seed', seed)
		.attr('result', 'turb');

	filter.append('feDisplacementMap')
		.attr('in', 'SourceGraphic')
		.attr('in2', 'turb')
		.attr('scale', scale)
		.attr('xChannelSelector', 'R')
		.attr('yChannelSelector', 'G');

	return `url(#${id})`;
}

/**
 * The "fill grain" texture used in the company-grid crayon filter
 * (subtle noise multiplied over the fill, separate from edge wobble).
 * Pulled out for reuse in case other charts want the same paper-grain
 * look on filled shapes rather than just wobbly edges.
 */
export function addFillGrain(filter, opts = {}) {
	const { seed = 15, baseFrequency = 0.65, slope = 0.12, intercept = 0.88 } = opts;

	filter.append('feTurbulence')
		.attr('type', 'fractalNoise')
		.attr('baseFrequency', baseFrequency)
		.attr('numOctaves', 3)
		.attr('seed', seed)
		.attr('result', 'grain');

	filter.append('feColorMatrix')
		.attr('type', 'saturate')
		.attr('values', '0')
		.attr('in', 'grain')
		.attr('result', 'monoGrain');

	const transfer = filter.append('feComponentTransfer')
		.attr('in', 'monoGrain')
		.attr('result', 'subtleGrain');

	['feFuncR', 'feFuncG', 'feFuncB'].forEach((fn) => {
		transfer.append(fn).attr('type', 'linear').attr('slope', slope).attr('intercept', intercept);
	});

	filter.append('feBlend')
		.attr('in', 'wobbled')
		.attr('in2', 'subtleGrain')
		.attr('mode', 'multiply');
}
