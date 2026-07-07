---
name: verify
description: Build/launch/drive recipe for verifying changes to this static D3 scrollytelling site (charts, mobile layouts, tap interactions).
---

# Verifying this site

Static site, no build step. Serve the repo root and drive it with a real browser.

## Serve

```bash
npx --yes http-server -p 8931 -s   # from repo root, run in background
```

## Drive (headless Edge via puppeteer-core)

No Playwright on this machine; install `puppeteer-core` (small, no browser download)
in the scratchpad and point it at Edge:

```js
const browser = await require('puppeteer-core').launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new',
});
```

- Mobile: `page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })`
- Desktop: `1440×900`
- Collect `pageerror` + console errors; a favicon 404 is expected noise.
- Charts animate in (~1.2–1.8s); `sleep` after `scrollIntoView` before screenshots.

## Flows worth driving

- **Company grid (mobile)**: `#scrolly` → tap `#mscrolly-next`, tap left/right halves
  of `#viz` — verifies the tap narrative (ui/mobile-scrolly.js) and grid beats.
- **Company grid (desktop)**: scroll ~1.5 viewport past `#scrolly` top — scrollama steps.
- **Hiring quiz**: click `#submit-ranking`, wait ~3s → stacked bar reveals.
- **Standalone charts**: scroll to `#salary-section`, `#challenges-wrap`,
  `#gender-wrap`, `#maturity-wrap`.

## Gotchas

- Charts branch on `isMobileViewport()` (680px, must match styles.css media queries).
- CSS classes like `.gender-axis-label` set `text-anchor` — inline `.style()` is
  required to override in chart code; `.attr('text-anchor', …)` silently loses.
- Breakpoint-crossing re-renders are wired in main.js (`breakpointCharts`).
