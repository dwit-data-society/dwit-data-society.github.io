# Fix All Codebase Audit Issues

This plan addresses every issue in `codebase_audit.md`: wiring all chart migrations, filling stub files, fixing structural inconsistencies, and ensuring all charts follow a consistent structure.

## Proposed Changes

### 1. Create Missing Utility: `utils/dom.js`

Three charts import `ensureSvg` from `../utils/dom.js` but this file doesn't exist. It needs to be created.

#### [NEW] [dom.js](file:///Users/arunmainali/Desktop/deerwalk-data-society/job-fair-web-viz/src/js/utils/dom.js)
- Export `ensureSvg(container)` — returns a d3 selection of an existing or newly-created `<svg>` inside the container.

---

### 2. Fill Empty Stub: `training-charts.js`

Currently 0 bytes. The HTML has two SVGs (`#training-donut` and `#training-dotplot`), and two data files exist: `training_donut.csv` (donut split: 73% offer / 27% don't) and `training_frequency.csv` (per-company training frequency in years).

#### [MODIFY] [training-charts.js](file:///Users/arunmainali/Desktop/deerwalk-data-society/job-fair-web-viz/src/js/charts/training-charts.js)
- Build using `createChart` factory from `chart-base.js`
- `init()` sets up two SVGs (donut + dot plot)
- `render(data)` draws: (a) a crayon-style donut showing training offer split, (b) a dot plot showing each company's training frequency in years
- Load data from `training_donut.csv` and `training_frequency.csv` via `loadCSV()`
- Use `THEME` colors and `createCrayonFilter`

---

### 3. Fill Empty Stub: `company-maturity-scatter.js`

Currently 0 bytes. The HTML has `#maturity-scatter`. Data is in `benefits-vs.json` → `analysis3_tenure_proxy_vs_outcomes` (three scatter sets: salary, benefits, satisfaction vs. company age proxy).

#### [MODIFY] [company-maturity-scatter.js](file:///Users/arunmainali/Desktop/deerwalk-data-society/job-fair-web-viz/src/js/charts/company-maturity-scatter.js)
- Build using `createChart` factory
- Three-panel scatter plot (salary, benefits, satisfaction vs tenure proxy)
- Load data from `benefits-vs.json` via `loadJSON()`
- Regression line from the data's `regression_*` fields
- Use `THEME` colors and `createCrayonFilter`

---

### 4. Wrap `gender-disparity-bar.js` in `createChart` Factory

Currently exports a standalone `renderGenderDisparityBar(containerEl)` function instead of using the standard lifecycle API.

#### [MODIFY] [gender-disparity-bar.js](file:///Users/arunmainali/Desktop/deerwalk-data-society/job-fair-web-viz/src/js/charts/gender-disparity-bar.js)
- Wrap in `createChart()` factory, export `createGenderDisparityBar(container)`
- Move render logic into `render()` lifecycle method
- Replace hardcoded hex colors (`'#7a9e87'`, `'#c8956a'`, etc.) with `THEME.colors.*`
- Keep inline `DATA` array (matches the original — gender.json was never used)

---

### 5. Refactor `salary-experience-line.js` Data Loading

Currently fetches data internally in `render()` with no error handling.

#### [MODIFY] [salary-experience-line.js](file:///Users/arunmainali/Desktop/deerwalk-data-society/job-fair-web-viz/src/js/charts/salary-experience-line.js)
- Export a `loadSalaryData()` function so `main.js` can fetch/error-handle
- `render(data)` accepts pre-loaded data instead of loading internally
- Replace hardcoded hex colors with `THEME.colors.*`

---

### 6. Consolidate Theme Colors in `config.js`

The audit flags hardcoded palettes in `challenges-bubble.js`, `hiring-priorities.js`, and `ui/landing.js`.

#### [MODIFY] [config.js](file:///Users/arunmainali/Desktop/deerwalk-data-society/job-fair-web-viz/src/js/config.js)
- Add `THEME.colors.paperFill` (the `#faf6ee` used in hiring-priorities and landing)
- Add `THEME.colors.bubblePalette` array (15 fill colors from challenges-bubble)
- Add `THEME.colors.bubbleStrokePalette` array (15 stroke colors)
- Add `THEME.colors.landingFills` array (the 10 paper fill variants)
- Add `THEME.colors.rankColors` object for hiring-priorities stacked bar

---

### 7. Update Charts to Use Consolidated Theme

#### [MODIFY] [challenges-bubble.js](file:///Users/arunmainali/Desktop/deerwalk-data-society/job-fair-web-viz/src/js/charts/challenges-bubble.js)
- Replace hardcoded `PALETTE`/`STROKE_PALETTE` with `THEME.colors.bubblePalette`/`THEME.colors.bubbleStrokePalette`

#### [MODIFY] [hiring-priorities.js](file:///Users/arunmainali/Desktop/deerwalk-data-society/job-fair-web-viz/src/js/charts/hiring-priorities.js)
- Replace `PAPER_FILL` with `THEME.colors.paperFill`
- Replace hardcoded `rankColors` with `THEME.colors.rankColors`
- Import `THEME`

#### [MODIFY] [landing.js](file:///Users/arunmainali/Desktop/deerwalk-data-society/job-fair-web-viz/src/js/ui/landing.js)
- Replace `FILLS` with `THEME.colors.landingFills`
- Replace `LINE_CLR`/`BORDER` with `THEME.colors.neutral`

---

### 8. Wire All Charts in `main.js`

The main entry point only initializes workmode-bar and company-grid. All 6 remaining charts need to be imported and booted.

#### [MODIFY] [main.js](file:///Users/arunmainali/Desktop/deerwalk-data-society/job-fair-web-viz/src/js/main.js)
- Import and init `initLanding()` from `ui/landing.js` (replaces setTimeout stub)
- Import and init `initPaperTexture()` from `ui/paper-texture.js`
- Import and init `initTornPapers()` from `ui/torn-papers.js`
- Import and boot `createHiringPriorities` → `#hiring-section`
- Import and boot `createSalaryExperienceLine` + `loadSalaryData` → `#salary-line` (with try/catch error handling)
- Import and boot `createChallengesBubble` → `#challenges-bubbles`
- Import and boot `createGenderDisparityBar` → `#gender-chart`
- Import and boot `createCompanyMaturityScatter` → `#maturity-scatter`
- Import and boot `createTrainingCharts` → `#training-viz`
- Remove the TODO block and placeholder setTimeout landing code
- Wrap each chart init in consistent try/catch with `viz-error` fallback

---

### 9. Clean Up Empty Stub Files

#### [DELETE] [sections/landing.js](file:///Users/arunmainali/Desktop/deerwalk-data-society/job-fair-web-viz/src/js/sections/landing.js)
- 0 bytes, obsolete — `ui/landing.js` is the real implementation

#### [DELETE] [sections/step-backgrounds.js](file:///Users/arunmainali/Desktop/deerwalk-data-society/job-fair-web-viz/src/js/sections/step-backgrounds.js)
- 0 bytes, obsolete — `ui/torn-papers.js` handles step backgrounds

#### [DELETE] [utils/paper-texture.js](file:///Users/arunmainali/Desktop/deerwalk-data-society/job-fair-web-viz/src/js/utils/paper-texture.js)
- 0 bytes, obsolete — `ui/paper-texture.js` is the real implementation

---

## Verification Plan

### Manual Verification
- Open `index.html` in a browser with a local server
- Verify all 8 chart sections render: company-grid, workmode-bar, hiring-priorities, salary-line, challenges-bubble, gender-chart, maturity-scatter, training-charts
- Verify the landing animation plays (falling papers)
- Verify the paper texture background appears
- Verify torn paper backgrounds behind scroll steps
- Verify drag interactions (workmode bar, hiring quiz) still work
- Check browser console for errors
