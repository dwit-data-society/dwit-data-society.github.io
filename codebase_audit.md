# Codebase Audit: Temporary Code & Inconsistencies

This report details instances of incomplete code, temporary placeholders, and structural inconsistencies found during the codebase audit of the web visualization project.

## Part 1: Temporary & Incomplete Code

### 1. Unwired Chart Migrations
- **File:** `src/js/main.js`
- **Line:** 10-14 & 79-88
- **Comment text:** 
  - `* Only the two migrated charts (workmode-bar, company-grid) are wired up. * The other 8 sections from the original file aren't migrated yet — see`
  - `// ── TODO: remaining charts, same pattern ────────────────`
- **Context:** The main entry point only initializes `workmode-bar` and `company-grid`. The other 6-8 chart modules exist in the `charts/` directory but are not imported or executed.
- **Status:** **Blocking** (Charts will not render on the page until wired up).

### 2. Landing Animation Placeholder
- **File:** `src/js/main.js`
- **Line:** 27-32
- **Comment text:** `// Minimal stand-in only: the CSS hides #landing-title/#landing-subtitle/ ... // isn't migrated yet — see TODO list below — so this just reveals the ... // Replace with the real landing.js migration when you get to it.`
- **Context:** A simple `setTimeout` is used to reveal the title text. The full falling-papers animation has actually been migrated to `src/js/ui/landing.js`, but it is not imported or used here. 
- **Status:** Not blocking, but missing intended visual functionality.

### 3. Empty Stub Files
- **Files:** 
  - `src/js/charts/company-maturity-scatter.js`
  - `src/js/charts/training-charts.js`
  - `src/js/sections/landing.js`
  - `src/js/sections/step-backgrounds.js`
  - `src/js/utils/paper-texture.js`
- **Context:** These files are completely empty (0 bytes). They appear to be stubs created during the migration process. Note that `ui/landing.js` and `ui/paper-texture.js` exist and have code, meaning the `sections/` and `utils/` counterparts might be obsolete or waiting for wrappers.
- **Status:** **Blocking** (Feature functionality missing).

### 4. "Lazy" Loading Note
- **File:** `src/js/charts/hiring-priorities.js`
- **Line:** 8-9
- **Comment text:** `* needed). The stacked bar chart is genuinely lazy — it only fetches * data/hiring_priorities.json once the user submits their ranking, exactly`
- **Context:** This describes lazy-loading behavior (deferring data fetch until user interaction). While it uses a targeted keyword, it is an intentional architectural decision, not a hack.
- **Status:** Working as intended (Not blocking).


## Part 2: Structural Inconsistencies

### 1. Module Patterns (The `createChart` base)
- **Pattern:** Using the `createChart()` factory from `chart-base.js` to standardize the `init()`, `resize()`, and `render()` lifecycle.
- **Follow:** `company-grid.js`, `workmode-bar.js`, `salary-experience-line.js`, `challenges-bubble.js`, `hiring-priorities.js`.
- **Deviate:** `gender-disparity-bar.js` exports a standalone `renderGenderDisparityBar(containerEl)` function.
- **Impact:** Maintainability issue. Because `main.js` expects all charts to follow the same lifecycle API (`chart.init().resize().render()`), wiring up `gender-disparity-bar.js` will require one-off logic.

### 2. Data Loading Patterns
- **Pattern:** Top-level data fetching. Charts export data loaders or `main.js` fetches data, which is then passed down via `chart.render(data)`.
- **Follow:** `company-grid.js` (exports `loadCompanyGridData`), `main.js` handles the fetching and passing.
- **Deviate:** 
  - `salary-experience-line.js` calls `loadCSV()` internally within its `render()` method.
  - `hiring-priorities.js` calls `loadJSON()` internally within its `render()` method.
  - `gender-disparity-bar.js` and `challenges-bubble.js` use hardcoded inline `DATA` arrays.
- **Impact:** Global loading states and data deduplication are harder to manage when charts fetch their own data internally.

### 3. Error Handling
- **Pattern:** Centralized error handling. `main.js` uses a `try/catch` block to handle data loading failures, rendering a `<p class="viz-error">` fallback.
- **Follow:** `company-grid.js` (because it is wrapped in `main.js`'s try/catch).
- **Deviate:** `salary-experience-line.js` and `hiring-priorities.js` fetch data internally without error handling.
- **Impact:** If the network request fails, these modules will throw unhandled promise rejections. The chart will remain empty with no error UI presented to the user.

### 4. Configuration & Theme Values
- **Pattern:** Importing the `THEME` object from `config.js` to ensure a single source of truth for design tokens.
- **Follow:** `company-grid.js`, `workmode-bar.js`.
- **Deviate:** 
  - `challenges-bubble.js` hardcodes large `PALETTE` and `STROKE_PALETTE` hex arrays.
  - `hiring-priorities.js` hardcodes `const PAPER_FILL = '#faf6ee';`.
  - `ui/landing.js` hardcodes `const FILLS = [...]` and `LINE_CLR`.
- **Impact:** Design system drift. Changing colors in CSS or `config.js` will not propagate to these charts.

### 5. Lifecycle API Implementation (Scroll Events)
- **Pattern:** `chart-base.js` exposes an `update(progress)` method specifically meant to handle 0→1 scroll position updates.
- **Follow:** Explicitly highlighted as a feature in `chart-base.js`.
- **Deviate:** `company-grid.js` bypasses `update(progress)` and instead exposes scrollama-specific public methods: `stepEnter()`, `stepExit()`, and `stepProgress()`.
- **Impact:** `main.js` is forced to wire up scrollama differently depending on the specific chart, rather than using a generic event pipe into `chart.update()`.


## Part 3: Summary & Prioritized Action Plan

### 1. Critical Blockers (Do First)
1. **Implement missing logic:** Address the empty stub files (`training-charts.js` and `company-maturity-scatter.js`) by migrating their respective logic from the legacy application.
2. **Wire up remaining charts:** Complete the `main.js` boot sequence by importing and initializing the 6 remaining migrated charts.

### 2. Migration Work Remaining
1. **Connect Landing Animation:** Remove the `setTimeout` "stand-in" in `main.js` and wire up the actual `initLanding()` function from `src/js/ui/landing.js`.
2. **Clean up empty files:** Determine if `src/js/sections/landing.js`, `sections/step-backgrounds.js`, and `utils/paper-texture.js` are obsolete and delete them, or populate them if they serve a purpose.

### 3. Architectural Inconsistencies (Refactoring)
1. **Standardize Data Loading:** Refactor `salary-experience-line.js` and `hiring-priorities.js` to accept data via `chart.render(data)` instead of fetching it internally. Move fetching to `main.js` to ensure consistent error-handling UI.
2. **Unify the Base API:** Wrap `gender-disparity-bar.js` in the standard `createChart()` factory.
3. **Consolidate Theme Colors:** Move the hardcoded palettes from `challenges-bubble.js`, `hiring-priorities.js`, and `ui/landing.js` into `config.js` (`THEME`).

### 4. Low-Priority Cleanup
1. **Refactor Scroll Methods:** Consider updating `company-grid.js` to utilize the standard `chart.update(progress, meta)` lifecycle hook rather than custom `stepEnter/Exit/Progress` methods.
