/**
 * utils/load-data.js
 * ─────────────────────────────────────────────────────────
 * The original file calls d3.json / d3.csv / fetch at 6+ different sites,
 * each with its own (or no) error handling. This wraps them consistently
 * and gives you ONE place to add things like a user-facing error state,
 * retry logic, or response caching later.
 *
 * Usage:
 *   import { loadAll } from '../utils/load-data.js';
 *   const { companySize, entryLevel } = await loadAll({
 *     companySize: { url: 'data/company_size.json' },
 *     entryLevel:  { url: 'data/entry_level.json' },
 *   });
 */

import * as d3 from 'd3';

export async function loadJSON(url) {
	try {
		return await d3.json(url);
	} catch (err) {
		console.error(`[load-data] failed to load JSON: ${url}`, err);
		throw err;
	}
}

export async function loadCSV(url, { autoType = true } = {}) {
	try {
		return await d3.csv(url, autoType ? d3.autoType : undefined);
	} catch (err) {
		console.error(`[load-data] failed to load CSV: ${url}`, err);
		throw err;
	}
}

export async function loadText(url) {
	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
		return await res.text();
	} catch (err) {
		console.error(`[load-data] failed to load text asset: ${url}`, err);
		throw err;
	}
}

/**
 * Load several named sources in parallel.
 * @param {Object.<string, {url: string, type?: 'json'|'csv'|'text'}>} sources
 * @returns {Promise<Object.<string, any>>} resolved values keyed the same way
 *
 * Failures are NOT swallowed — if you want a chart to degrade gracefully
 * instead of throwing, catch around your `loadAll()` call at the chart level
 * and decide what "no data" should look like for that specific chart.
 */
export async function loadAll(sources) {
	const entries = Object.entries(sources);
	const loaders = {
		json: loadJSON,
		csv: (url) => loadCSV(url),
		text: loadText,
	};

	const results = await Promise.all(
		entries.map(([, { url, type = 'json' }]) => loaders[type](url))
	);

	return Object.fromEntries(entries.map(([key], i) => [key, results[i]]));
}
