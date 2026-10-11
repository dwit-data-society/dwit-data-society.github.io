"use client";

import { useRouter } from "next/navigation";
import BackButton from "@/components/shared/BackButton";
import DropDown from "@/components/shared/DropDown";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
} from "recharts";

/* =====================================================================
 * TYPES & DATA HELPERS (unchanged behaviour)
 * ===================================================================== */

type DataRecord = Record<string, any>;

function normalizeArray(value: any): DataRecord[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const possibleKeys = [
    "data",
    "results",
    "records",
    "items",
    "values",
    "rows",
    "predictions",
    "teams",
    "players",
  ];

  for (const key of possibleKeys) {
    if (Array.isArray(value[key])) {
      return value[key];
    }
  }

  return [];
}

function getText(item: DataRecord, keys: string[], fallback = "Unknown"): string {
  for (const key of keys) {
    if (
      item[key] !== undefined &&
      item[key] !== null &&
      String(item[key]).trim() !== ""
    ) {
      return String(item[key]);
    }
  }

  return fallback;
}

function getNumber(item: DataRecord, keys: string[]): number | null {
  for (const key of keys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== "") {
      const value = Number(item[key]);

      if (Number.isFinite(value)) {
        return value;
      }
    }
  }

  return null;
}

/** Some scoreline datasets store the result as a single "score" string
 *  ("2-1"), others as two goal fields (goal1/goal2). Handles both. */
function getScoreLabel(item: DataRecord): string {
  const direct = getText(item, ["score", "scoreline", "result"], "");

  if (direct) {
    return direct;
  }

  const goal1 = getNumber(item, ["goal1", "home_goals", "team1_goals"]);
  const goal2 = getNumber(item, ["goal2", "away_goals", "team2_goals"]);

  if (goal1 !== null && goal2 !== null) {
    return `${goal1}-${goal2}`;
  }

  return "Unknown";
}

/* =====================================================================
 * SMALL PURE UTILITIES
 * ===================================================================== */

const COLORS = {
  teal: "var(--primary)",
  blue: "var(--secondary)",
  sky: "var(--secondary)",
  amber: "#F5B544",
  red: "#F87171",
  yellowCard: "#FACC15",
  redCard: "#EF4444",
};

const compactFormat = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function nf(value: number, decimals = 0): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function scrollToId(id: string, smooth: boolean) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
}

function parseScore(label: string): [number, number] | null {
  const match = /(\d+)\D+(\d+)/.exec(label);

  return match ? [Number(match[1]), Number(match[2])] : null;
}

type ScoreTable = {
  map: Map<string, number>;
  total: number;
  maxGoals: number;
};

/** Turns raw scoreline rows (goal1/goal2/count or score/count) into a
 *  lookup of "h-a" -> count, without any slicing. */
function buildScoreTable(rows: DataRecord[]): ScoreTable {
  const map = new Map<string, number>();
  let total = 0;
  let maxGoals = 0;

  for (const item of rows) {
    const label = getScoreLabel(item);
    const parsed = parseScore(label);
    const count = getNumber(item, [
      "count",
      "timesOccurred",
      "times_occurred",
      "occurrences",
      "timesPredicted",
      "times_predicted",
      "predictions",
    ]);

    if (!parsed || count === null || count <= 0) {
      continue;
    }

    const key = `${parsed[0]}-${parsed[1]}`;

    map.set(key, (map.get(key) ?? 0) + count);
    total += count;
    maxGoals = Math.max(maxGoals, parsed[0], parsed[1]);
  }

  return { map, total, maxGoals };
}

type ConfidencePoint = {
  match: string;
  confidence: number;
  accuracy: number;
  predictions: number | null;
  crowdPick: string | null;
  actualOutcome: string | null;
};

function weightedAccuracy(points: ConfidencePoint[]): number {
  let sum = 0;
  let weights = 0;

  for (const point of points) {
    const weight =
      point.predictions !== null && point.predictions > 0
        ? point.predictions
        : 1;

    sum += point.accuracy * weight;
    weights += weight;
  }

  return weights > 0 ? sum / weights : 0;
}

function outcomeLabel(token: string | null, match: string): string {
  if (!token) {
    return "unknown";
  }

  const teams = match.split(/\s+vs\.?\s+/i);

  if (token === "team1" && teams[0]) {
    return teams[0];
  }

  if (token === "team2" && teams[1]) {
    return teams[1];
  }

  return token === "draw" ? "a draw" : token;
}

/* =====================================================================
 * GUESS OPTION BUILDER
 * ===================================================================== */

type GuessOption = { id: string; label: string };

type GuessSetup = {
  options: GuessOption[];
  correctIds: string[];
  correctNames: string[];
  values: Record<string, number>;
};

function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

/** Takes a list sorted high -> low and builds a shuffled multiple-choice
 *  set. Every item tied for first place counts as a correct answer. */
function buildGuessOptions<T>(
  sortedDesc: T[],
  labelFn: (item: T) => string,
  valueFn: (item: T) => number,
  count = 4,
): GuessSetup | null {
  if (sortedDesc.length < 2) {
    return null;
  }

  const topValue = valueFn(sortedDesc[0]);
  const leaders = sortedDesc
    .filter((item) => valueFn(item) === topValue)
    .slice(0, count - 1);
  const rest = sortedDesc.filter((item) => valueFn(item) !== topValue);
  const chosen = [...leaders, ...rest.slice(0, count - leaders.length)];

  if (chosen.length < 2) {
    return null;
  }

  const withIds = chosen.map((item, i) => ({
    id: `opt-${i}`,
    label: labelFn(item),
    value: valueFn(item),
    isLeader: i < leaders.length,
  }));

  return {
    options: shuffleArray(withIds).map(({ id, label }) => ({ id, label })),
    correctIds: withIds.filter((w) => w.isLeader).map((w) => w.id),
    correctNames: withIds.filter((w) => w.isLeader).map((w) => w.label),
    values: Object.fromEntries(withIds.map((w) => [w.id, w.value])),
  };
}

/* =====================================================================
 * GLOBAL STYLES (keyframes, range slider, scroll reveal)
 * ===================================================================== */

const GLOBAL_CSS = `
.wc-reveal{opacity:0;transform:translateY(28px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1)}
.wc-reveal[data-visible="true"]{opacity:1;transform:none}
@keyframes wc-pop{0%{transform:scale(1)}40%{transform:scale(1.025)}100%{transform:scale(1)}}
@keyframes wc-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
@keyframes wc-fade-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.wc-pop{animation:wc-pop .5s ease}
.wc-shake{animation:wc-shake .4s ease}
.wc-fade-up{animation:wc-fade-up .7s cubic-bezier(.2,.7,.2,1) both}
.wc-range{-webkit-appearance:none;appearance:none;width:100%;height:48px;background:transparent;cursor:pointer;touch-action:pan-y}
.wc-range:disabled{cursor:default}
.wc-range:focus{outline:none}
.wc-range::-webkit-slider-runnable-track{height:10px;border-radius:999px;background:linear-gradient(to right,var(--wc-fill,var(--primary)) var(--wc-pct,50%),rgba(255,255,255,.12) var(--wc-pct,50%))}
.wc-range::-moz-range-track{height:10px;border-radius:999px;background:rgba(255,255,255,.12)}
.wc-range::-moz-range-progress{height:10px;border-radius:999px;background:var(--wc-fill,var(--primary))}
.wc-range::-webkit-slider-thumb{-webkit-appearance:none;width:32px;height:32px;margin-top:-11px;border-radius:999px;background:#fff;border:5px solid var(--wc-fill,var(--primary));box-shadow:0 4px 18px rgba(0,0,0,.55);transition:transform .15s ease}
.wc-range::-moz-range-thumb{width:22px;height:22px;border-radius:999px;background:#fff;border:5px solid var(--wc-fill,var(--primary));box-shadow:0 4px 18px rgba(0,0,0,.55)}
.wc-range:active::-webkit-slider-thumb{transform:scale(1.15)}
.wc-range:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 5px rgba(8,170,165,.4)}
.wc-range:focus-visible::-moz-range-thumb{box-shadow:0 0 0 5px rgba(8,170,165,.4)}
@media (prefers-reduced-motion:reduce){.wc-reveal{opacity:1;transform:none;transition:none}.wc-pop,.wc-shake,.wc-fade-up{animation:none}}
`;

/* =====================================================================
 * HOOKS
 * ===================================================================== */

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const NARROW_QUERY = "(max-width: 639px)";

function subscribeReduced(callback: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);

  mq.addEventListener("change", callback);

  return () => mq.removeEventListener("change", callback);
}

function subscribeNarrow(callback: () => void) {
  const mq = window.matchMedia(NARROW_QUERY);

  mq.addEventListener("change", callback);

  return () => mq.removeEventListener("change", callback);
}

const getReduced = () => window.matchMedia(REDUCED_QUERY).matches;
const getNarrow = () => window.matchMedia(NARROW_QUERY).matches;
const getServerFalse = () => false;

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, getReduced, getServerFalse);
}

function useIsNarrow(): boolean {
  return useSyncExternalStore(subscribeNarrow, getNarrow, getServerFalse);
}

/** Fires once when the element first scrolls into view. */
function useInView<T extends Element>(threshold = 0.1) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView] as const;
}

/** True one frame after mount, so CSS width/left transitions can play. */
function useEntered(): boolean {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));

    return () => cancelAnimationFrame(frame);
  }, []);

  return entered;
}

/** Animates toward `target` from wherever it currently is. */
function useAnimatedNumber(target: number, active: boolean, duration = 1000) {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  const valueRef = useRef(0);

  useEffect(() => {
    if (!active || reduced || !Number.isFinite(target)) {
      return;
    }

    const from = valueRef.current;
    let frame = 0;
    let start: number | null = null;

    const step = (timestamp: number) => {
      if (start === null) {
        start = timestamp;
      }

      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (target - from) * eased;

      valueRef.current = next;
      setValue(next);

      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [target, active, reduced, duration]);

  if (reduced && active) {
    return target;
  }

  return value;
}

/* =====================================================================
 * GUESS SCORE CONTEXT (keeps score state out of the page component, so
 * answering a guess never re-renders the whole page)
 * ===================================================================== */

type ScoreContextValue = {
  answers: Record<string, boolean>;
  order: string[];
  record: (key: string, correct: boolean) => void;
};

const GuessScoreContext = createContext<ScoreContextValue>({
  answers: {},
  order: [],
  record: () => undefined,
});

function GuessScoreProvider({
  order,
  children,
}: {
  order: string[];
  children: ReactNode;
}) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  const record = useCallback((key: string, correct: boolean) => {
    setAnswers((prev) => (key in prev ? prev : { ...prev, [key]: correct }));
  }, []);

  const value = useMemo(
    () => ({ answers, order, record }),
    [answers, order, record],
  );

  return (
    <GuessScoreContext.Provider value={value}>
      {children}
    </GuessScoreContext.Provider>
  );
}

/* =====================================================================
 * PRESENTATION PRIMITIVES
 * ===================================================================== */

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.06);

  return (
    <div
      ref={ref}
      data-visible={inView}
      className={`wc-reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  active,
  duration = 1200,
  className = "",
  style,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  active?: boolean;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const [ref, inView] = useInView<HTMLSpanElement>(0.2);
  const shown = useAnimatedNumber(value, active ?? inView, duration);

  return (
    <span ref={ref} className={`tabular-nums ${className}`} style={style}>
      {prefix}
      {nf(shown, decimals)}
      {suffix}
    </span>
  );
}

function StatHighlight({
  value,
  decimals = 0,
  prefix,
  suffix,
  label,
  sub,
  color = COLORS.teal,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="min-w-0">
      <AnimatedNumber
        value={value}
        decimals={decimals}
        prefix={prefix}
        suffix={suffix}
        className="block text-5xl font-black leading-none tracking-tight sm:text-6xl"
        style={{ color }}
      />
      <p className="mt-3 text-base font-medium text-white sm:text-lg">{label}</p>
      {sub && <p className="mt-1 text-sm text-slate-400">{sub}</p>}
    </div>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-white/10 bg-gradient-to-br from-[var(--background)]/90 via-[var(--background)]/90 to-[var(--background)]/90 p-6 shadow-2xl shadow-black/30 sm:p-10 lg:p-12 ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <Reveal className="mb-12 sm:mb-16">
      {eyebrow && (
        <p className="text-sm font-medium text-[var(--primary)] sm:text-base">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-3 max-w-5xl text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
        {title}
      </h2>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl sm:leading-9">
        {description}
      </p>
    </Reveal>
  );
}

function EmptyChartMessage({ message }: { message: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-[var(--tertiary)] p-6 text-center text-sm leading-6 text-slate-300">
      {message}
    </div>
  );
}

function InsightBlock({
  label = "Insight",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className="wc-fade-up rounded-lg border-l-4 border-[var(--primary)] bg-[var(--primary)]/[0.07] px-5 py-5 sm:px-7 sm:py-6">
      <p className="text-sm font-semibold text-[var(--primary)]">{label}</p>
      <p className="mt-2 text-base leading-7 text-slate-200 sm:text-lg sm:leading-8">
        {children}
      </p>
    </div>
  );
}

function ChartPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Reveal>
      <Panel className="h-full">
        <h3 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h3>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">
          {description}
        </p>
        <div className="mt-8 min-w-0">{children}</div>
      </Panel>
    </Reveal>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`min-h-[48px] rounded-lg border px-5 text-base font-semibold transition-colors duration-200 ${
              selected
                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--background)]"
                : "border-white/15 bg-white/[0.03] text-slate-200 hover:border-[var(--primary)]/70 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function PredictionSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  disabled,
  color = COLORS.teal,
  minLabel,
  maxLabel,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  display: ReactNode;
  disabled?: boolean;
  color?: string;
  minLabel?: string;
  maxLabel?: string;
}) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <label
          htmlFor={id}
          className="text-base font-medium text-slate-300 sm:text-lg"
        >
          {label}
        </label>
        <output
          htmlFor={id}
          className="text-5xl font-black tabular-nums leading-none sm:text-7xl"
          style={{ color }}
        >
          {display}
        </output>
      </div>

      <input
        id={id}
        type="range"
        className="wc-range mt-4"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        style={
          { "--wc-pct": `${pct}%`, "--wc-fill": color } as CSSProperties
        }
      />

      <div className="flex justify-between text-sm text-slate-500">
        <span>{minLabel ?? nf(min, step < 1 ? 1 : 0)}</span>
        <span>{maxLabel ?? nf(max, step < 1 ? 1 : 0)}</span>
      </div>
    </div>
  );
}

type CompareRow = {
  label: string;
  value: number;
  display: ReactNode;
  color: string;
  sub?: string;
};

/** Animated horizontal bars for comparing a handful of values. */
function ComparisonPanel({
  rows,
  max,
}: {
  rows: CompareRow[];
  max?: number;
}) {
  const entered = useEntered();
  const scale = max ?? Math.max(...rows.map((row) => row.value), 0.0001);

  return (
    <div className="space-y-5">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-baseline justify-between gap-4">
            <p className="min-w-0 text-sm font-medium text-slate-300 sm:text-base">
              {row.label}
            </p>
            <p
              className="shrink-0 text-xl font-bold tabular-nums sm:text-2xl"
              style={{ color: row.color }}
            >
              {row.display}
            </p>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
              style={{
                width: entered
                  ? `${Math.min((row.value / scale) * 100, 100)}%`
                  : "0%",
                backgroundColor: row.color,
              }}
            />
          </div>
          {row.sub && <p className="mt-1 text-xs text-slate-500">{row.sub}</p>}
        </div>
      ))}
    </div>
  );
}

function NextButton({
  targetId,
  label,
}: {
  targetId: string;
  label: string;
}) {
  const reduced = usePrefersReducedMotion();

  return (
    <button
      type="button"
      onClick={() => scrollToId(targetId, !reduced)}
      className="mt-8 inline-flex min-h-[52px] items-center gap-3 rounded-lg border border-[var(--primary)]/60 px-6 text-base font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-[var(--background)]"
    >
      {label}
      <span aria-hidden>↓</span>
    </button>
  );
}

/* =====================================================================
 * CHARTS
 * ===================================================================== */

function ChartTooltip({
  active,
  payload,
  label,
  title,
  format,
  extra,
}: {
  active?: boolean;
  payload?: ReadonlyArray<any>;
  label?: string | number;
  title?: (row: DataRecord) => string;
  format?: (value: number, name: string) => string;
  extra?: (row: DataRecord) => ReactNode;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const row: DataRecord = payload[0]?.payload ?? {};
  const heading = title ? title(row) : String(label ?? row.name ?? "");

  return (
    <div className="max-w-[260px] rounded-lg border border-white/15 bg-[#07101A]/95 px-4 py-3 text-sm shadow-2xl">
      <p className="font-semibold text-white">{heading}</p>
      {payload.map((entry, index) => {
        const value = Number(entry.value);
        const shown = Number.isFinite(value)
          ? format
            ? format(value, String(entry.name))
            : nf(value, Number.isInteger(value) ? 0 : 2)
          : String(entry.value);

        return (
          <p
            key={`${entry.dataKey ?? entry.name}-${index}`}
            className="mt-1.5 flex items-center gap-2 text-slate-300"
          >
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: entry.color ?? entry.fill ?? COLORS.teal,
              }}
            />
            {entry.name}:{" "}
            <span className="font-semibold text-white">{shown}</span>
          </p>
        );
      })}
      {extra?.(row)}
    </div>
  );
}

type ChartSeries = { key: string; name: string; color: string };

const AXIS_TICK = { fill: "#94A3B8", fontSize: 12 };
const AXIS_LINE = "#1E3A4C";
const GRID_LINE = "rgba(148,163,184,0.12)";

/** One chart component for every ranked / categorical bar chart on the page.
 *  Click a bar to focus it (uncontrolled), or drive the highlight from
 *  outside (controlled) for guess reveals and explorers. */
function RankedBarChart({
  data,
  nameKey = "name",
  series,
  stacked = false,
  orientation = "rows",
  height,
  highlight,
  onSelect,
  cellColor,
  showReadout,
  valueFormatter,
  tooltipTitle,
  xLabel,
  valueDomain,
}: {
  data: DataRecord[];
  nameKey?: string;
  series: ChartSeries[];
  stacked?: boolean;
  orientation?: "rows" | "columns";
  height?: number;
  highlight?: string[] | null;
  onSelect?: (name: string) => void;
  cellColor?: (name: string, seriesKey: string) => string | undefined;
  showReadout?: boolean;
  valueFormatter?: (value: number) => string;
  tooltipTitle?: (row: DataRecord) => string;
  xLabel?: string;
  valueDomain?: [number, number];
}) {
  const narrow = useIsNarrow();
  const [inner, setInner] = useState<string | null>(null);

  const controlled = highlight !== undefined;
  const active: string[] | null = controlled
    ? highlight
    : inner
      ? [inner]
      : null;
  const readout = showReadout ?? !controlled;
  const isRows = orientation === "rows";

  const select = useCallback(
    (name: string | undefined) => {
      if (!name) {
        return;
      }

      if (onSelect) {
        onSelect(name);
      } else {
        setInner((prev) => (prev === name ? null : name));
      }
    },
    [onSelect],
  );

  const chartHeight =
    height ??
    (isRows
      ? Math.max(340, data.length * (narrow ? 40 : 46) + 70)
      : narrow
        ? 340
        : 440);

  const fmt =
    valueFormatter ??
    ((value: number) => nf(value, Number.isInteger(value) ? 0 : 2));

  const focusName = (active && active[0]) ?? String(data[0]?.[nameKey] ?? "");
  const focusRow = data.find((row) => String(row[nameKey]) === focusName);
  const radius: [number, number, number, number] | undefined = stacked
    ? undefined
    : isRows
      ? [0, 8, 8, 0]
      : [8, 8, 0, 0];

  return (
    <div className="min-w-0">
      {readout && focusRow && (
        <div className="mb-5 flex flex-wrap items-baseline gap-x-8 gap-y-2">
          <p className="text-xl font-bold text-white sm:text-2xl">
            {String(focusRow[nameKey])}
          </p>
          {series.map((s) => {
            const value = Number(focusRow[s.key] ?? 0);

            return (
              <p key={s.key} className="text-slate-400">
                <AnimatedNumber
                  value={value}
                  decimals={Number.isInteger(value) ? 0 : 1}
                  active
                  className="text-3xl font-black sm:text-4xl"
                  style={{ color: s.color }}
                />{" "}
                <span className="text-sm">{s.name}</span>
              </p>
            );
          })}
          <span className="text-xs text-slate-500">
            {active ? "Click the bar again to clear" : "Click any bar to focus it"}
          </span>
        </div>
      )}

      <div
        className="w-full min-w-0 [&_.recharts-bar-rectangle]:cursor-pointer [&_svg]:outline-none"
        style={{ height: chartHeight }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={isRows ? "vertical" : "horizontal"}
            margin={
              isRows
                ? { top: 8, right: 24, left: 4, bottom: 8 }
                : { top: 12, right: 12, left: 0, bottom: xLabel ? 28 : 4 }
            }
            barCategoryGap="20%"
          >
            <CartesianGrid
              stroke={GRID_LINE}
              horizontal={!isRows}
              vertical={isRows}
            />
            {isRows && (
              <XAxis
                type="number"
                tick={AXIS_TICK}
                stroke={AXIS_LINE}
                domain={valueDomain}
                tickFormatter={(v) => compactFormat.format(Number(v))}
              />
            )}
            {isRows && (
              <YAxis
                type="category"
                dataKey={nameKey}
                width={narrow ? 104 : 210}
                interval={0}
                tick={{ fill: "#CBD5E1", fontSize: narrow ? 11 : 13 }}
                stroke={AXIS_LINE}
                tickFormatter={(v) => truncate(String(v), narrow ? 15 : 30)}
              />
            )}
            {!isRows && (
              <XAxis
                dataKey={nameKey}
                interval={0}
                tick={AXIS_TICK}
                stroke={AXIS_LINE}
                label={
                  xLabel
                    ? {
                        value: xLabel,
                        position: "insideBottom",
                        offset: -14,
                        fill: "#94A3B8",
                        fontSize: 12,
                      }
                    : undefined
                }
              />
            )}
            {!isRows && (
              <YAxis
                tick={AXIS_TICK}
                stroke={AXIS_LINE}
                domain={valueDomain}
                tickFormatter={(v) => compactFormat.format(Number(v))}
              />
            )}
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              content={
                <ChartTooltip
                  format={(value) => fmt(value)}
                  title={
                    tooltipTitle ?? ((row) => String(row[nameKey] ?? ""))
                  }
                />
              }
            />
            {series.length > 1 && (
              <Legend wrapperStyle={{ color: "#CBD5E1", fontSize: 13 }} />
            )}
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                stackId={stacked ? "stack" : undefined}
                radius={radius}
                animationDuration={900}
                onClick={(entry: any) =>
                  select(
                    entry?.[nameKey] !== undefined
                      ? String(entry[nameKey])
                      : entry?.payload?.[nameKey] !== undefined
                        ? String(entry.payload[nameKey])
                        : undefined,
                  )
                }
              >
                {data.map((row, index) => {
                  const name = String(row[nameKey]);
                  const dimmed = active !== null && !active.includes(name);

                  return (
                    <Cell
                      key={`${s.key}-${index}`}
                      fill={cellColor?.(name, s.key) ?? s.color}
                      fillOpacity={dimmed ? 0.28 : 1}
                    />
                  );
                })}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type TeamPoint = { name: string; goals: number; goalsPer90: number };

/** Scatter used inside the "top team" guess reveal. */
function TeamGoalsScatter({
  data,
  correct,
  pick,
}: {
  data: TeamPoint[];
  correct: string[];
  pick: string;
}) {
  return (
    <div className="h-[380px] w-full min-w-0 sm:h-[480px] [&_svg]:outline-none">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 28, right: 24, bottom: 36, left: 8 }}>
          <CartesianGrid stroke={GRID_LINE} />
          <XAxis
            type="number"
            dataKey="goalsPer90"
            name="Goals per 90"
            tick={AXIS_TICK}
            stroke={AXIS_LINE}
            domain={["dataMin - 0.2", "dataMax + 0.2"]}
            tickFormatter={(v) => nf(Number(v), 1)}
            label={{
              value: "Goals per 90 minutes",
              position: "insideBottom",
              offset: -14,
              fill: "#94A3B8",
              fontSize: 12,
            }}
          />
          <YAxis
            type="number"
            dataKey="goals"
            name="Total goals"
            tick={AXIS_TICK}
            stroke={AXIS_LINE}
            domain={["dataMin - 2", "dataMax + 2"]}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={<ChartTooltip />}
          />
          <Scatter
            data={data}
            animationDuration={900}
            shape={(props: any) => {
              const { cx, cy, payload } = props;

              if (typeof cx !== "number" || typeof cy !== "number") {
                return <g />;
              }

              const correctIndex = correct.indexOf(payload.name);
              const isCorrect = correctIndex >= 0;
              const isPick = payload.name === pick;
              const focus = isCorrect || isPick;
              const color = isCorrect
                ? COLORS.teal
                : isPick
                  ? COLORS.red
                  : COLORS.sky;
              const r = focus ? 11 : 6;

              return (
                <g>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={color}
                    fillOpacity={focus ? 1 : 0.45}
                    stroke={focus ? "#fff" : "none"}
                    strokeWidth={2}
                  />
                  {focus && (
                    <text
                      x={cx}
                      y={correctIndex % 2 === 1 ? cy + r + 16 : cy - r - 7}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize={12}
                      fontWeight={600}
                    >
                      {payload.name}
                    </text>
                  )}
                </g>
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/* =====================================================================
 * GUESS EXPERIENCES
 * ===================================================================== */

type GuessResultCtx = {
  selectedLabel: string;
  correctNames: string[];
  isCorrect: boolean;
};

function guessCellColor(ctx: GuessResultCtx) {
  return (name: string, _seriesKey: string): string | undefined => {
    if (ctx.correctNames.includes(name)) {
      return COLORS.teal;
    }

    if (name === ctx.selectedLabel) {
      return COLORS.red;
    }

    return undefined;
  };
}

function GuessShell({
  id,
  index,
  total,
  question,
  helper,
  children,
}: {
  id: string;
  index: number;
  total: number;
  question: string;
  helper?: string;
  children: ReactNode;
}) {
  const { answers, order } = useContext(GuessScoreContext);

  return (
    <div id={id} className="scroll-mt-6">
      <Reveal>
        <Panel className="relative overflow-hidden">
          <div className="relative">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <p className="text-sm font-medium text-[var(--primary)] sm:text-base">
                Prediction {index} of {total}
              </p>
              <div className="flex gap-1.5" aria-hidden>
                {order.map((key, i) => (
                  <span
                    key={key}
                    className={`h-1.5 w-8 rounded-full transition-colors duration-500 ${
                      answers[key] === true
                        ? "bg-[var(--primary)]"
                        : answers[key] === false
                          ? "bg-red-400"
                          : i + 1 === index
                            ? "bg-white/60"
                            : "bg-white/15"
                    }`}
                  />
                ))}
              </div>
            </div>

            <h3 className="mt-6 max-w-4xl text-3xl font-semibold leading-tight text-white sm:text-5xl">
              {question}
            </h3>

            {helper && (
              <p className="mt-3 max-w-3xl text-base text-slate-400 sm:text-lg">
                {helper}
              </p>
            )}

            {children}
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}

/** Multiple-choice guess: pick -> verdict -> animated answer -> compare -> chart. */
function GuessMoment({
  id,
  guessKey,
  index,
  total,
  question,
  helper,
  options,
  correctIds,
  optionValues,
  formatValue,
  resultTitle,
  correctNames,
  resultValue,
  resultValueLabel,
  insight,
  nextId,
  nextLabel,
  children,
}: {
  id: string;
  guessKey: string;
  index: number;
  total: number;
  question: string;
  helper?: string;
  options: GuessOption[];
  correctIds: string[];
  optionValues: Record<string, number>;
  formatValue: (value: number) => string;
  resultTitle: string;
  correctNames: string[];
  resultValue: number;
  resultValueLabel: string;
  insight?: string;
  nextId?: string;
  nextLabel?: string;
  children: (ctx: GuessResultCtx) => ReactNode;
}) {
  const { record } = useContext(GuessScoreContext);
  const reduced = usePrefersReducedMotion();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showData, setShowData] = useState(false);

  useEffect(() => {
    if (selectedId === null) {
      return;
    }

    const timer = window.setTimeout(
      () => setShowData(true),
      reduced ? 0 : 650,
    );

    return () => window.clearTimeout(timer);
  }, [selectedId, reduced]);

  const answered = selectedId !== null;
  const isCorrect = answered && correctIds.includes(selectedId!);
  const selectedLabel =
    options.find((option) => option.id === selectedId)?.label ?? "";

  function select(optionId: string) {
    if (selectedId !== null) {
      return;
    }

    setSelectedId(optionId);

    record(guessKey, correctIds.includes(optionId));
  }

  const ctx: GuessResultCtx = { selectedLabel, correctNames, isCorrect };
  const pickValue = selectedId ? optionValues[selectedId] : undefined;

  return (
    <GuessShell
      id={id}
      index={index}
      total={total}
      question={question}
      helper={helper}
    >
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {options.map((option, i) => {
          const isPick = option.id === selectedId;
          const isAnswer = correctIds.includes(option.id);
          const letter = String.fromCharCode(65 + i);

          let tone =
            "border-white/10 bg-white/[0.03] text-slate-100 hover:border-[var(--primary)]/70 hover:bg-[var(--primary)]/10";
          let badge = "border-white/20 text-slate-300";

          if (answered) {
            if (isAnswer) {
              tone = "border-[var(--primary)] bg-[var(--primary)]/15 text-white";
              badge = "border-[var(--primary)] bg-[var(--primary)] text-[var(--background)]";
            } else if (isPick) {
              tone = "border-red-400/70 bg-red-500/10 text-red-100";
              badge = "border-red-400 bg-red-400 text-[#2A0B0B]";
            } else {
              tone = "border-white/5 bg-white/[0.02] text-slate-500";
              badge = "border-white/10 text-slate-600";
            }
          }

          const animation =
            answered && isPick ? (isAnswer ? "wc-pop" : "wc-shake") : "";

          return (
            <button
              key={option.id}
              type="button"
              disabled={answered}
              aria-pressed={isPick}
              onClick={() => select(option.id)}
              className={`flex min-h-[76px] items-center gap-4 rounded-lg border px-5 py-4 text-left text-lg font-semibold transition-colors duration-300 sm:min-h-[92px] sm:text-xl ${tone} ${animation} ${
                answered ? "cursor-default" : "cursor-pointer active:scale-[0.98]"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${badge}`}
              >
                {answered && isAnswer ? "✓" : answered && isPick ? "✕" : letter}
              </span>
              <span className="min-w-0 break-words">{option.label}</span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="wc-fade-up mt-12 border-t border-white/10 pt-12">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div className="min-w-0">
              <p
                className={`text-base font-bold sm:text-lg ${
                  isCorrect
                    ? "text-[var(--primary)]"
                    : "text-red-300"
                }`}
              >
                {isCorrect
                  ? "✓ You got it"
                  : "✕ Not quite"}
              </p>

              <p className="mt-6 text-xs text-slate-400">The answer</p>
              <p className="mt-1 break-words text-2xl font-black leading-tight text-white sm:text-4xl">
                {resultTitle}
              </p>

              <p className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <AnimatedNumber
                  value={resultValue}
                  active
                  className="text-4xl font-black text-[var(--primary)] sm:text-6xl"
                />
                <span className="text-lg text-slate-300 sm:text-xl">
                  {resultValueLabel}
                </span>
              </p>

              {!isCorrect && pickValue !== undefined && (
                <div className="mt-10">
                  <p className="mb-4 text-sm font-semibold text-slate-400">
                    Your pick vs the answer
                  </p>
                  <ComparisonPanel
                    max={Math.max(resultValue, pickValue)}
                    rows={[
                      {
                        label: `Your pick · ${selectedLabel}`,
                        value: pickValue,
                        display: formatValue(pickValue),
                        color: COLORS.amber,
                      },
                      {
                        label: `Answer · ${resultTitle}`,
                        value: resultValue,
                        display: formatValue(resultValue),
                        color: COLORS.teal,
                      },
                    ]}
                  />
                </div>
              )}

              {insight && showData && (
                <div className="mt-10">
                  <InsightBlock>{insight}</InsightBlock>
                </div>
              )}

              {nextId && showData && nextLabel !== "Next prediction" && (
                <NextButton
                  targetId={nextId}
                  label={nextLabel ?? "Next prediction"}
                />
              )}
            </div>

            <div className="min-w-0">
              {showData ? (
                <div className="wc-fade-up">{children(ctx)}</div>
              ) : (
                <div className="h-[380px]" aria-hidden />
              )}
            </div>
          </div>
        </div>
      )}
    </GuessShell>
  );
}

function ErrorScale({
  min,
  max,
  guess,
  actual,
}: {
  min: number;
  max: number;
  guess: number;
  actual: number;
}) {
  const entered = useEntered();
  const span = max - min || 1;
  const pos = (value: number) => `${((value - min) / span) * 100}%`;
  const low = Math.min(guess, actual);
  const high = Math.max(guess, actual);

  return (
    <div className="relative mx-8 mt-4 h-[84px]">
      <div className="absolute left-0 right-0 top-8 h-2 rounded-full bg-white/10" />

      <div
        className="absolute top-8 h-2 rounded-full bg-gradient-to-r from-[var(--tertiary)] to-[var(--primary)] transition-[width] duration-1000 ease-out motion-reduce:transition-none"
        style={{
          left: pos(low),
          width: entered ? `${((high - low) / span) * 100}%` : "0%",
        }}
      />

      <div
        className="absolute top-0 -translate-x-1/2 text-center"
        style={{ left: pos(guess) }}
      >
        <p className="text-sm font-semibold text-[var(--tertiary)]">You</p>
      </div>
      <span
        className="absolute top-[26px] h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-[var(--tertiary)]"
        style={{ left: pos(guess) }}
      />

      <span
        className="absolute top-[26px] h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-[var(--primary)] transition-[left] duration-1000 ease-out motion-reduce:transition-none"
        style={{ left: entered ? pos(actual) : pos(guess) }}
      />
      <p
        className="absolute top-[56px] -translate-x-1/2 text-sm font-semibold text-[var(--primary)] transition-[left] duration-1000 ease-out motion-reduce:transition-none"
        style={{ left: entered ? pos(actual) : pos(guess) }}
      >
        Actual
      </p>
    </div>
  );
}

/** Numeric guess: slider -> reveal -> your guess vs actual with the error. */
function SliderGuessMoment({
  id,
  guessKey,
  index,
  total,
  question,
  helper,
  min,
  max,
  step,
  initial,
  actual,
  unit,
  tolerance,
  insight,
  nextId,
  nextLabel,
  children,
}: {
  id: string;
  guessKey: string;
  index: number;
  total: number;
  question: string;
  helper?: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  actual: number;
  unit: string;
  tolerance: number;
  insight?: string;
  nextId?: string;
  nextLabel?: string;
  children: ReactNode;
}) {
  const { record } = useContext(GuessScoreContext);
  const reduced = usePrefersReducedMotion();
  const [guess, setGuess] = useState(initial);
  const [revealed, setRevealed] = useState(false);
  const [showData, setShowData] = useState(false);

  useEffect(() => {
    if (!revealed) {
      return;
    }

    const timer = window.setTimeout(
      () => setShowData(true),
      reduced ? 0 : 900,
    );

    return () => window.clearTimeout(timer);
  }, [revealed, reduced]);

  const error = Math.abs(guess - actual);
  const withinTolerance = error <= tolerance;
  const verdict =
    error <= 0.1
      ? "Bullseye"
      : error <= tolerance
        ? "Very close"
        : error <= 0.75
          ? "Not far off"
          : "Way off";

  function reveal() {
    if (revealed) {
      return;
    }

    setRevealed(true);
    record(guessKey, withinTolerance);
  }

  return (
    <GuessShell
      id={id}
      index={index}
      total={total}
      question={question}
      helper={helper}
    >
      <div className="mt-10 max-w-4xl">
        <PredictionSlider
          id={`${id}-slider`}
          label="Your guess"
          value={guess}
          min={min}
          max={max}
          step={step}
          onChange={setGuess}
          display={nf(guess, 1)}
          disabled={revealed}
          color={COLORS.amber}
          minLabel={`${nf(min, 1)} ${unit}`}
          maxLabel={`${nf(max, 1)} ${unit}`}
        />

        {!revealed && (
          <>
            <button
              type="button"
              onClick={reveal}
              className="mt-6 min-h-[56px] rounded-lg bg-[var(--primary)] px-8 text-lg font-bold text-[var(--background)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Lock in my guess
            </button>
            <p className="mt-3 text-sm text-slate-500">
              Within {nf(tolerance, 2)} {unit} counts as correct.
            </p>
          </>
        )}
      </div>

      {revealed && (
        <div className="wc-fade-up mt-12 border-t border-white/10 pt-12">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div className="min-w-0">
              <p
                className={`text-base font-bold sm:text-lg ${
                  withinTolerance ? "text-[var(--primary)]" : "text-red-300"
                }`}
              >
                {withinTolerance ? "✓" : "✕"} {verdict}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-400">Your guess</p>
                  <p className="mt-1 text-5xl font-black tabular-nums text-[var(--tertiary)] sm:text-7xl">
                    {nf(guess, 1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Actual</p>
                  <AnimatedNumber
                    value={actual}
                    decimals={2}
                    active
                    className="mt-1 block text-5xl font-black text-[var(--primary)] sm:text-7xl"
                  />
                </div>
              </div>

              <p className="mt-6 text-lg text-slate-300">
                You were off by{" "}
                <AnimatedNumber
                  value={error}
                  decimals={2}
                  active
                  className="font-bold text-white"
                />{" "}
                {unit}.
              </p>

              <ErrorScale min={min} max={max} guess={guess} actual={actual} />

              {insight && showData && (
                <div className="mt-8">
                  <InsightBlock>{insight}</InsightBlock>
                </div>
              )}
            </div>

            <div className="min-w-0">
              {showData ? (
                <div className="wc-fade-up">{children}</div>
              ) : (
                <div className="h-[380px]" aria-hidden />
              )}
            </div>
          </div>
        </div>
      )}
    </GuessShell>
  );
}

/* =====================================================================
 * PREDICTION EXPLORERS
 * ===================================================================== */

function ExplorerLayout({
  controls,
  visual,
}: {
  controls: ReactNode;
  visual: ReactNode;
}) {
  return (
    <div className="grid gap-12 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:gap-16">
      <div className="min-w-0 space-y-8">{controls}</div>
      <div className="min-w-0">{visual}</div>
    </div>
  );
}

function ExplorerTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-10 max-w-3xl">
      <p className="text-sm font-semibold text-[var(--primary)]">{eyebrow}</p>
      <h3 className="mt-2 text-3xl font-semibold text-white sm:text-5xl">
        {title}
      </h3>
      <p className="mt-4 text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
        {description}
      </p>
    </div>
  );
}

type StageAccuracy = { stage: string; accuracy: number };

function AccuracyExplorer({ data }: { data: StageAccuracy[] }) {
  const [selected, setSelected] = useState(data[0]?.stage ?? "");

  const average = useMemo(
    () =>
      data.length > 0
        ? data.reduce((sum, d) => sum + d.accuracy, 0) / data.length
        : 0,
    [data],
  );

  const ranked = useMemo(
    () => [...data].sort((a, b) => b.accuracy - a.accuracy),
    [data],
  );

  const highlight = useMemo(() => [selected], [selected]);
  const options = useMemo(
    () => data.map((d) => ({ value: d.stage, label: d.stage })),
    [data],
  );

  const current = data.find((d) => d.stage === selected) ?? data[0];

  if (!current) {
    return <EmptyChartMessage message="No valid accuracy data was found." />;
  }

  const rank = ranked.findIndex((d) => d.stage === current.stage) + 1;
  const diff = current.accuracy - average;

  return (
    <ExplorerLayout
      controls={
        <>
          <div>
            <p className="mb-3 text-sm font-medium text-slate-400">
              Match type
            </p>
            <Segmented
              ariaLabel="Match type"
              options={options}
              value={current.stage}
              onChange={setSelected}
            />
          </div>

          <div>
            <AnimatedNumber
              value={current.accuracy}
              decimals={1}
              suffix="%"
              active
              className="block text-6xl font-black leading-none text-[var(--primary)] sm:text-7xl xl:text-8xl"
            />
            <p className="mt-3 text-lg text-slate-300">
              prediction accuracy for {current.stage}
            </p>
          </div>

          <ComparisonPanel
            max={100}
            rows={[
              {
                label: current.stage,
                value: current.accuracy,
                display: `${nf(current.accuracy, 1)}%`,
                color: COLORS.teal,
              },
              {
                label: "Average across match types",
                value: average,
                display: `${nf(average, 1)}%`,
                color: COLORS.blue,
              },
            ]}
          />

          <InsightBlock key={current.stage}>
            {current.stage} ranks #{rank} of {data.length} for accuracy —{" "}
            {nf(Math.abs(diff), 1)} points {diff >= 0 ? "above" : "below"} the
            average across match types.
          </InsightBlock>
        </>
      }
      visual={
        <RankedBarChart
          data={data}
          nameKey="stage"
          orientation="columns"
          series={[{ key: "accuracy", name: "Accuracy", color: COLORS.teal }]}
          highlight={highlight}
          onSelect={setSelected}
          valueDomain={[0, 100]}
          valueFormatter={(v) => `${nf(v, 1)}%`}
          height={460}
        />
      }
    />
  );
}

function ConfidenceExplorer({ data }: { data: ConfidencePoint[] }) {
  const levels = useMemo(
    () =>
      Array.from(new Set(data.map((d) => round2(d.confidence)))).sort(
        (a, b) => a - b,
      ),
    [data],
  );

  const byLevel = useMemo(() => {
    const groups = new Map<number, ConfidencePoint[]>();

    for (const point of data) {
      const key = round2(point.confidence);
      const list = groups.get(key);

      if (list) {
        list.push(point);
      } else {
        groups.set(key, [point]);
      }
    }

    return groups;
  }, [data]);

  const overall = useMemo(() => weightedAccuracy(data), [data]);
  const [index, setIndex] = useState(() =>
    Math.max(0, Math.floor((levels.length - 1) / 2)),
  );

  const level = levels[Math.min(index, levels.length - 1)];
  const points = useMemo(
    () => (level === undefined ? [] : (byLevel.get(level) ?? [])),
    [byLevel, level],
  );
  const levelAccuracy = useMemo(() => weightedAccuracy(points), [points]);

  const split = useMemo(
    () => ({
      active: data.filter((d) => round2(d.confidence) === level),
      dim: data.filter((d) => round2(d.confidence) !== level),
    }),
    [data, level],
  );

  const pickLevel = useCallback(
    (confidence: number) => {
      const next = levels.indexOf(round2(confidence));

      if (next >= 0) {
        setIndex(next);
      }
    },
    [levels],
  );

  if (levels.length === 0 || level === undefined) {
    return (
      <EmptyChartMessage message="No valid confidence-versus-accuracy data was found." />
    );
  }

  const worst = [...points].sort((a, b) => a.accuracy - b.accuracy)[0];
  const diff = levelAccuracy - overall;

  return (
    <ExplorerLayout
      controls={
        <>
          <PredictionSlider
            id="confidence-slider"
            label="How confident was the crowd?"
            value={index}
            min={0}
            max={levels.length - 1}
            step={1}
            onChange={setIndex}
            display={`${nf(level, 1)}%`}
            minLabel={`${nf(levels[0], 0)}% agreed`}
            maxLabel={`${nf(levels[levels.length - 1], 0)}% agreed`}
          />

          <div>
            <AnimatedNumber
              value={levelAccuracy}
              decimals={1}
              suffix="%"
              active
              className="block text-6xl font-black leading-none text-[var(--primary)] sm:text-7xl xl:text-8xl"
            />
            <p className="mt-3 text-lg text-slate-300">
              average accuracy across {points.length}{" "}
              {points.length === 1 ? "match" : "matches"} at this confidence
            </p>
          </div>

          <ComparisonPanel
            max={100}
            rows={[
              {
                label: `At ${nf(level, 1)}% consensus`,
                value: levelAccuracy,
                display: `${nf(levelAccuracy, 1)}%`,
                color: COLORS.teal,
              },
              {
                label: "All matches",
                value: overall,
                display: `${nf(overall, 1)}%`,
                color: COLORS.blue,
              },
            ]}
          />

          <InsightBlock key={level}>
            When {nf(level, 1)}% of fans agreed, the crowd called the right
            outcome {nf(levelAccuracy, 1)}% of the time —{" "}
            {nf(Math.abs(diff), 1)} points {diff >= 0 ? "above" : "below"} the
            overall average.
            {worst
              ? ` Biggest miss at this level: ${worst.match} (${nf(worst.accuracy, 1)}% accurate).`
              : ""}
          </InsightBlock>
        </>
      }
      visual={
        <div>
          <p className="mb-4 text-sm text-slate-400">
            Each dot is one match. Click a dot to jump to its confidence level.
          </p>
          <div className="h-[420px] w-full min-w-0 sm:h-[560px] [&_svg]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 16, right: 24, bottom: 40, left: 8 }}>
                <CartesianGrid stroke={GRID_LINE} />
                <XAxis
                  type="number"
                  dataKey="confidence"
                  name="Consensus"
                  domain={[0, 100]}
                  tick={AXIS_TICK}
                  stroke={AXIS_LINE}
                  tickFormatter={(v) => `${v}%`}
                  label={{
                    value: "Crowd consensus",
                    position: "insideBottom",
                    offset: -16,
                    fill: "#94A3B8",
                    fontSize: 12,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="accuracy"
                  name="Accuracy"
                  domain={[0, 100]}
                  tick={AXIS_TICK}
                  stroke={AXIS_LINE}
                  tickFormatter={(v) => `${v}%`}
                />
                <ReferenceLine
                  x={level}
                  stroke={COLORS.amber}
                  strokeDasharray="5 5"
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={
                    <ChartTooltip
                      title={(row) => String(row.match ?? "")}
                      format={(value) => `${nf(value, 1)}%`}
                      extra={(row) => (
                        <p className="mt-2 text-xs text-slate-400">
                          Crowd picked{" "}
                          {outcomeLabel(row.crowdPick ?? null, row.match ?? "")}
                          {" · "}Actual:{" "}
                          {outcomeLabel(
                            row.actualOutcome ?? null,
                            row.match ?? "",
                          )}
                        </p>
                      )}
                    />
                  }
                />
                <Scatter
                  data={split.dim}
                  animationDuration={700}
                  onClick={(point: any) =>
                    pickLevel(Number(point?.confidence ?? point?.payload?.confidence))
                  }
                  shape={(props: any) => (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={6}
                      fill={COLORS.sky}
                      fillOpacity={0.35}
                      className="cursor-pointer"
                    />
                  )}
                />
                <Scatter
                  data={split.active}
                  animationDuration={500}
                  onClick={(point: any) =>
                    pickLevel(Number(point?.confidence ?? point?.payload?.confidence))
                  }
                  shape={(props: any) => (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={11}
                      fill={COLORS.amber}
                      stroke="#fff"
                      strokeWidth={2}
                      className="cursor-pointer"
                    />
                  )}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      }
    />
  );
}

type WinnerRow = { name: string; predictions: number; percent: number | null };

function WinnerExplorer({ data }: { data: WinnerRow[] }) {
  const [selected, setSelected] = useState(data[0]?.name ?? "");
  const highlight = useMemo(() => [selected], [selected]);
  const options = useMemo(
    () => data.map((d) => ({ value: d.name, label: d.name })),
    [data],
  );
  const totalPicks = useMemo(
    () => data.reduce((sum, d) => sum + d.predictions, 0),
    [data],
  );

  const index = data.findIndex((d) => d.name === selected);
  const current = data[index >= 0 ? index : 0];

  if (!current) {
    return (
      <EmptyChartMessage message="No valid tournament-winner prediction data was found." />
    );
  }

  const rank = (index >= 0 ? index : 0) + 1;
  const leader = data[0];
  const share =
    current.percent ??
    (totalPicks > 0 ? (current.predictions / totalPicks) * 100 : 0);
  const gap = leader.predictions - current.predictions;

  return (
    <ExplorerLayout
      controls={
        <>
          <div>
            <p className="mb-3 text-sm font-medium text-slate-400">
              Pick a team
            </p>
            <Segmented
              ariaLabel="Team"
              options={options}
              value={current.name}
              onChange={setSelected}
            />
          </div>

          <div className="flex flex-wrap items-start gap-x-12 gap-y-8">
            <div className="min-w-0">
              <AnimatedNumber
                value={share}
                decimals={1}
                suffix="%"
                active
                className="block text-5xl font-black leading-none text-[var(--primary)] sm:text-6xl xl:text-7xl"
              />
              <p className="mt-3 text-base text-slate-300">of fans picked them</p>
            </div>
            <div className="min-w-0">
              <AnimatedNumber
                value={current.predictions}
                active
                className="block text-5xl font-black leading-none text-white sm:text-6xl xl:text-7xl"
              />
              <p className="mt-3 text-base text-slate-300">
                {current.predictions === 1 ? "pick" : "picks"} · rank #{rank} of{" "}
                {data.length}
              </p>
            </div>
          </div>

          <ComparisonPanel
            max={leader.predictions}
            rows={[
              {
                label: current.name,
                value: current.predictions,
                display: nf(current.predictions),
                color: COLORS.teal,
              },
              {
                label: `Most picked · ${leader.name}`,
                value: leader.predictions,
                display: nf(leader.predictions),
                color: COLORS.blue,
              },
            ]}
          />

          <InsightBlock key={current.name}>
            {gap === 0
              ? `${current.name} led the field with ${current.predictions} picks, ${current.predictions - (data[1]?.predictions ?? 0)} ahead of ${data[1]?.name ?? "the next team"}.`
              : `${current.name} collected ${current.predictions} ${current.predictions === 1 ? "pick" : "picks"} — ${gap} fewer than ${leader.name}.`}
          </InsightBlock>
        </>
      }
      visual={
        <RankedBarChart
          data={data}
          series={[
            { key: "predictions", name: "Picks", color: COLORS.blue },
          ]}
          highlight={highlight}
          onSelect={setSelected}
          cellColor={(name) => (name === selected ? COLORS.teal : undefined)}
          height={Math.max(420, data.length * 56 + 70)}
        />
      }
    />
  );
}

type TeamGoals = { name: string; predicted: number; actual: number };

function GoalsLab({ data }: { data: TeamGoals[] }) {
  const sortedByGap = useMemo(
    () =>
      [...data].sort(
        (a, b) =>
          Math.abs(b.predicted - b.actual) - Math.abs(a.predicted - a.actual),
      ),
    [data],
  );

  const alphabetical = useMemo(
    () => [...data].sort((a, b) => a.name.localeCompare(b.name)),
    [data],
  );

  const overrated = useMemo(
    () =>
      [...data]
        .filter((t) => t.predicted > t.actual)
        .sort((a, b) => b.predicted - b.actual - (a.predicted - a.actual))
        .slice(0, 4),
    [data],
  );

  const underrated = useMemo(
    () =>
      [...data]
        .filter((t) => t.actual > t.predicted)
        .sort((a, b) => b.actual - b.predicted - (a.actual - a.predicted))
        .slice(0, 4),
    [data],
  );

  const maxValue = useMemo(
    () =>
      Math.max(
        1,
        Math.ceil(
          Math.max(...data.map((t) => Math.max(t.predicted, t.actual)), 0) * 2,
        ) / 2,
      ),
    [data],
  );

  const [teamName, setTeamName] = useState(sortedByGap[0]?.name ?? "");
  const [guess, setGuess] = useState(() => Math.round((maxValue / 2) * 10) / 10);
  const [revealed, setRevealed] = useState(false);

  const selectTeam = useCallback((name: string) => {
    setTeamName(name);
    setRevealed(false);
  }, []);

  const team = data.find((t) => t.name === teamName) ?? sortedByGap[0];

  if (!team) {
    return (
      <EmptyChartMessage message="No valid predicted-vs-actual goals data was found." />
    );
  }

  const yourError = Math.abs(guess - team.actual);
  const crowdError = Math.abs(team.predicted - team.actual);
  const beatCrowd = yourError < crowdError;

  return (
    <ExplorerLayout
      controls={
        <>
          <div>
            <label
              htmlFor="goals-team"
              className="mb-3 block text-sm font-medium text-slate-400"
            >
              Choose a team
            </label>
            <DropDown
              id="goals-team"
              aria-label="Choose a team"
              options={alphabetical.map((t) => ({
                label: t.name,
                value: t.name,
              }))}
              value={team.name}
              onChange={selectTeam}
              placeholder="Choose a team"
              className="max-w-full"
              panelClassName="rounded-lg"
            />

            <div className="mt-5 space-y-3">
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">
                  Fans expected far more than they got
                </p>
                <Segmented
                  ariaLabel="Most overestimated teams"
                  options={overrated.map((t) => ({
                    value: t.name,
                    label: t.name,
                  }))}
                  value={team.name}
                  onChange={selectTeam}
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">
                  Teams that beat expectations
                </p>
                <Segmented
                  ariaLabel="Most underestimated teams"
                  options={underrated.map((t) => ({
                    value: t.name,
                    label: t.name,
                  }))}
                  value={team.name}
                  onChange={selectTeam}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-4 text-xl font-bold text-white sm:text-2xl">
              How many goals do you think {team.name} averaged?
            </p>
            <PredictionSlider
              id="goals-slider"
              label="Your prediction"
              value={guess}
              min={0}
              max={maxValue}
              step={0.1}
              onChange={setGuess}
              display={nf(guess, 1)}
              disabled={revealed}
              color={COLORS.amber}
            />

            {!revealed && (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="mt-4 min-h-[56px] rounded-lg bg-[var(--primary)] px-8 text-lg font-bold text-[var(--background)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Reveal the actual value
              </button>
            )}
          </div>

          {revealed && (
            <div className="wc-fade-up space-y-8">
              <ComparisonPanel
                max={maxValue}
                rows={[
                  {
                    label: "Your prediction",
                    value: guess,
                    display: nf(guess, 2),
                    color: COLORS.amber,
                  },
                  {
                    label: "What fans predicted",
                    value: team.predicted,
                    display: nf(team.predicted, 2),
                    color: COLORS.sky,
                  },
                  {
                    label: "Actual",
                    value: team.actual,
                    display: nf(team.actual, 2),
                    color: COLORS.teal,
                  },
                ]}
              />
              <InsightBlock key={`${team.name}-${guess}`}>
                You were off by {nf(yourError, 2)}; the crowd was off by{" "}
                {nf(crowdError, 2)}.{" "}
                {beatCrowd
                  ? "You beat the crowd on this one."
                  : yourError === crowdError
                    ? "A dead heat with the crowd."
                    : "The crowd was closer on this one."}{" "}
                Fans {team.predicted > team.actual ? "over" : "under"}estimated{" "}
                {team.name} by {nf(crowdError, 2)} goals.
              </InsightBlock>
            </div>
          )}
        </>
      }
      visual={
        <div>
          <p className="mb-4 text-sm text-slate-400">
            Every team: predicted vs actual. Points on the dashed line were
            predicted perfectly. Click a dot to explore that team.
          </p>
          <div className="h-[420px] w-full min-w-0 sm:h-[580px] [&_svg]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 16, right: 24, bottom: 40, left: 8 }}>
                <CartesianGrid stroke={GRID_LINE} />
                <XAxis
                  type="number"
                  dataKey="predicted"
                  name="Fans predicted"
                  domain={[0, maxValue]}
                  tick={AXIS_TICK}
                  stroke={AXIS_LINE}
                  tickFormatter={(v) => nf(Number(v), 1)}
                  label={{
                    value: "Goals fans predicted",
                    position: "insideBottom",
                    offset: -16,
                    fill: "#94A3B8",
                    fontSize: 12,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="actual"
                  name="Actual"
                  domain={[0, maxValue]}
                  tick={AXIS_TICK}
                  stroke={AXIS_LINE}
                  tickFormatter={(v) => nf(Number(v), 1)}
                />
                <ReferenceLine
                  segment={[
                    { x: 0, y: 0 },
                    { x: maxValue, y: maxValue },
                  ]}
                  stroke="#94A3B8"
                  strokeDasharray="6 6"
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={
                    <ChartTooltip
                      title={(row) => String(row.name ?? "")}
                      format={(value) => nf(value, 2)}
                    />
                  }
                />
                <Scatter
                  data={data}
                  animationDuration={800}
                  onClick={(point: any) => {
                    const name = point?.name ?? point?.payload?.name;

                    if (typeof name === "string") {
                      selectTeam(name);
                    }
                  }}
                  shape={(props: any) => {
                    const { cx, cy, payload } = props;

                    if (typeof cx !== "number" || typeof cy !== "number") {
                      return <g />;
                    }

                    const focus = payload.name === team.name;

                    return (
                      <g className="cursor-pointer">
                        <circle
                          cx={cx}
                          cy={cy}
                          r={focus ? 12 : 6}
                          fill={focus ? COLORS.amber : COLORS.teal}
                          fillOpacity={focus ? 1 : 0.5}
                          stroke={focus ? "#fff" : "none"}
                          strokeWidth={2}
                        />
                        {focus && (
                          <text
                            x={cx}
                            y={cy - 20}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize={13}
                            fontWeight={700}
                          >
                            {payload.name}
                          </text>
                        )}
                      </g>
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      }
    />
  );
}

function ScorelineLab({
  predicted,
  actual,
}: {
  predicted: ScoreTable;
  actual: ScoreTable;
}) {
  const gridMax = Math.max(predicted.maxGoals, actual.maxGoals, 3);

  const favourite = useMemo((): [number, number] => {
    let best: [number, number] = [2, 1];
    let bestCount = -1;

    predicted.map.forEach((count, key) => {
      const parsed = parseScore(key);

      if (parsed && count > bestCount) {
        best = parsed;
        bestCount = count;
      }
    });

    return best;
  }, [predicted]);

  const [home, setHome] = useState(Math.min(favourite[0], gridMax));
  const [away, setAway] = useState(Math.min(favourite[1], gridMax));

  const shareScale = useMemo(() => {
    let best = 1;

    predicted.map.forEach((count) => {
      best = Math.max(best, (count / predicted.total) * 100);
    });
    actual.map.forEach((count) => {
      best = Math.max(best, (count / actual.total) * 100);
    });

    return best;
  }, [predicted, actual]);

  const key = `${home}-${away}`;
  const predictedCount = predicted.map.get(key) ?? 0;
  const actualCount = actual.map.get(key) ?? 0;
  const predictedShare =
    predicted.total > 0 ? (predictedCount / predicted.total) * 100 : 0;
  const actualShare =
    actual.total > 0 ? (actualCount / actual.total) * 100 : 0;


  return (
    <ExplorerLayout
      controls={
        <>
          <div className="flex items-center justify-center gap-4 py-2 text-7xl font-black tabular-nums text-white sm:text-8xl sm:leading-none lg:text-[7rem]">
            <span>{home}</span>
            <span className="text-slate-600">–</span>
            <span>{away}</span>
          </div>

          <PredictionSlider
            id="score-home"
            label="Home goals"
            value={home}
            min={0}
            max={gridMax}
            step={1}
            onChange={setHome}
            display={home}
            color={COLORS.teal}
          />
          <PredictionSlider
            id="score-away"
            label="Away goals"
            value={away}
            min={0}
            max={gridMax}
            step={1}
            onChange={setAway}
            display={away}
            color={COLORS.sky}
          />
        </>
      }
      visual={
        <div className="space-y-10">
          <div className="flex flex-wrap items-start gap-x-12 gap-y-8">
            <div className="min-w-0">
              <p className="text-sm text-slate-400">Predicted by fans</p>
              <AnimatedNumber
                value={predictedShare}
                decimals={1}
                suffix="%"
                active
                className="block text-5xl font-black leading-none text-[var(--secondary)] sm:text-6xl xl:text-7xl"
              />
              <p className="mt-3 text-sm text-slate-400">
                {nf(predictedCount)} of {nf(predicted.total)} predictions
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-slate-400">Actually happened</p>
              <AnimatedNumber
                value={actualShare}
                decimals={1}
                suffix="%"
                active
                className="block text-5xl font-black leading-none text-[var(--primary)] sm:text-6xl xl:text-7xl"
              />
              <p className="mt-3 text-sm text-slate-400">
                {nf(actualCount)} of {nf(actual.total)} matches
              </p>
            </div>
          </div>

          <ComparisonPanel
            max={shareScale}
            rows={[
              {
                label: "Predicted share",
                value: predictedShare,
                display: `${nf(predictedShare, 1)}%`,
                color: COLORS.sky,
              },
              {
                label: "Actual share",
                value: actualShare,
                display: `${nf(actualShare, 1)}%`,
                color: COLORS.teal,
              },
            ]}
          />

        </div>
      }
    />
  );
}

type ScorePsychRow = { score: string; predicted: number; actual: number };

function ScorePsychologyPanel({
  data,
  predictedTotal,
  actualTotal,
}: {
  data: ScorePsychRow[];
  predictedTotal: number;
  actualTotal: number;
}) {
  const [view, setView] = useState<"counts" | "share">("share");
  const [selected, setSelected] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      data.map((row) => ({
        score: row.score,
        predictedValue:
          view === "share" && predictedTotal > 0
            ? (row.predicted / predictedTotal) * 100
            : row.predicted,
        actualValue:
          view === "share" && actualTotal > 0
            ? (row.actual / actualTotal) * 100
            : row.actual,
      })),
    [data, view, predictedTotal, actualTotal],
  );

  const highlight = useMemo(() => (selected ? [selected] : null), [selected]);
  const toggle = useCallback(
    (name: string) => setSelected((prev) => (prev === name ? null : name)),
    [],
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <Segmented
          ariaLabel="Chart view"
          value={view}
          onChange={setView}
          options={[
            { value: "share", label: "Share of all" },
            { value: "counts", label: "Raw counts" },
          ]}
        />
        <span className="text-sm text-slate-500">
          Click a scoreline to highlight it
        </span>
      </div>

      <RankedBarChart
        data={rows}
        nameKey="score"
        orientation="columns"
        height={480}
        series={[
          { key: "predictedValue", name: "Predicted", color: COLORS.sky },
          { key: "actualValue", name: "Actually occurred", color: COLORS.teal },
        ]}
        highlight={highlight}
        onSelect={toggle}
        showReadout={false}
        valueFormatter={(v) =>
          view === "share" ? `${nf(v, 1)}%` : nf(v, 0)
        }
      />

    </div>
  );
}

/* =====================================================================
 * HERO, KEY INSIGHTS, FINAL INSIGHTS
 * ===================================================================== */

function AnalyticsHero() {
  const reduced = usePrefersReducedMotion();

  return (
    <header className="relative pb-20 pt-8 sm:pb-28 sm:pt-12 lg:pt-16">
      <div className="wc-fade-up">
        <BackButton href="/" />
      </div>

      <div className="wc-fade-up mt-3 flex items-start gap-3 sm:mt-4 sm:gap-5">
        <h1 className="text-5xl font-semibold leading-[0.96] tracking-tight text-white sm:text-7xl lg:text-8xl xl:text-[9rem]">
          World Cup
          <br />
          <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
            Analytics
          </span>
        </h1>
      </div>

      <p className="wc-fade-up mt-5 max-w-3xl text-lg leading-8 text-slate-300 sm:mt-6 sm:text-xl sm:leading-9">
        Guess first, then see what the numbers say from packed stadiums and
        top scorers to how the college predicted every match.
      </p>

      <button
        type="button"
        onClick={() => scrollToId("guess", !reduced)}
        className="mt-8 inline-flex min-h-[52px] items-center gap-3 rounded-lg bg-[var(--primary)] px-7 text-base font-bold text-[var(--background)] transition-colors hover:bg-[var(--primary)]"
      >
        Start guessing <span aria-hidden>↓</span>
      </button>
      <button
        type="button"
        onClick={() => scrollToId("fans", !reduced)}
        className="mt-4 inline-flex min-h-[52px] items-center gap-3 rounded-lg border border-white/20 px-7 text-base font-semibold text-white transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] sm:ml-4 sm:mt-8"
      >
        Jump to the college predictions <span aria-hidden>↓</span>
      </button>
    </header>
  );
}

type InsightStat = {
  value: number;
  suffix?: string;
  label: string;
  sub?: string;
};

function KeyInsights({ items }: { items: InsightStat[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Reveal className="border-y border-white/10 py-14 sm:py-20">
      <p className="mb-10 text-sm font-medium text-[var(--primary)] sm:text-base">
        Before you guess, a few things worth knowing
      </p>
      <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <StatHighlight
            key={item.label}
            value={item.value}
            suffix={item.suffix}
            label={item.label}
            sub={item.sub}
            color={COLORS.sky}
          />
        ))}
      </div>
    </Reveal>
  );
}

type FinalInsight = { big: string; title: string; body: string };

function FinalInsights({ items }: { items: FinalInsight[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-x-16 gap-y-14 lg:grid-cols-2">
      {items.map((item, i) => (
        <Reveal key={item.title} delay={i * 80}>
          <p className="text-6xl font-black leading-none text-[var(--primary)] sm:text-8xl">
            {item.big}
          </p>
          <h3 className="mt-5 text-2xl font-semibold text-white sm:text-3xl">
            {item.title}
          </h3>
          <p className="mt-3 max-w-xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
            {item.body}
          </p>
        </Reveal>
      ))}
    </div>
  );
}

/* =====================================================================
 * PAGE CONTENT — all derived data lives in useMemo so interactions never
 * recompute datasets. Every hook runs before any conditional return.
 * ===================================================================== */

function AnalyticsContent({
  globalData,
  predictionData,
}: {
  globalData: Record<string, DataRecord[]>;
  predictionData: Record<string, DataRecord[]>;
}) {
  /* ---------- GLOBAL DATA ---------- */
  const router = useRouter()
  const attendeesAll = useMemo(() => {
    let total = 0;
    let count = 0;

    for (const item of globalData.attendees || []) {
      const attendance = getNumber(item, [
        "attendance",
        "attendees",
        "total_attendance",
        "total",
      ]);

      if (attendance !== null && attendance > 0) {
        total += attendance;
        count += 1;
      }
    }

    return { total, count };
  }, [globalData]);

  const attendeesData = useMemo(
    () =>
      (globalData.attendees || [])
        .flatMap((item) => {
          const name = getText(item, ["venue", "venue_name", "stadium", "name"]);
          const attendance = getNumber(item, [
            "attendance",
            "attendees",
            "total_attendance",
            "total",
          ]);

          return name !== "Unknown" && attendance !== null && attendance > 0
            ? [{ name, attendance }]
            : [];
        })
        .sort((a, b) => b.attendance - a.attendance)
        .slice(0, 10),
    [globalData],
  );

  const clubCountsData = useMemo(
    () =>
      (globalData.clubCounts || [])
        .flatMap((item) => {
          const name = getText(item, ["club", "club_name", "team", "name"]);
          const count = getNumber(item, [
            "count",
            "players",
            "player_count",
            "total",
          ]);

          return name !== "Unknown" && count !== null && count > 0
            ? [{ name, count }]
            : [];
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    [globalData],
  );

  const clubDiversityAll = useMemo(
    () =>
      (globalData.clubDiversity || []).flatMap((item) => {
        const name = getText(item, [
          "team",
          "team_name",
          "national_team",
          "name",
        ]);
        const diversity = getNumber(item, [
          "unique_clubs_represented",
          "unique_clubs",
          "club_diversity",
          "diversity",
          "count",
        ]);

        return name !== "Unknown" && diversity !== null && diversity > 0
          ? [{ name, diversity }]
          : [];
      }),
    [globalData],
  );

  const clubDiversityData = useMemo(
    () =>
      [...clubDiversityAll]
        .sort((a, b) => b.diversity - a.diversity)
        .slice(0, 15),
    [clubDiversityAll],
  );

  const refereeCardsData = useMemo(
    () =>
      (globalData.refereeCards || [])
        .map((item) => {
          const yellow =
            getNumber(item, [
              "total_yellow",
              "yellow_cards",
              "yellow_card",
              "yellow",
              "total_yellow_cards",
            ]) ?? 0;
          const red =
            getNumber(item, [
              "total_red",
              "red_cards",
              "red_card",
              "red",
              "total_red_cards",
            ]) ?? 0;
          const matches = getNumber(item, [
            "matches_officiated",
            "matches",
            "games",
          ]);

          return {
            name: getText(item, [
              "referee",
              "referee_name",
              "official",
              "name",
            ]),
            yellow,
            red,
            total: yellow + red,
            matches,
          };
        })
        .filter((item) => item.name !== "Unknown" && item.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 15),
    [globalData],
  );

  const topMinutesData = useMemo(
    () =>
      (globalData.topMinutes || [])
        .flatMap((item) => {
          const name = getText(item, ["player", "player_name", "name"]);
          const minutes = getNumber(item, [
            "minutes",
            "total_minutes",
            "playing_time",
          ]);

          return name !== "Unknown" && minutes !== null && minutes > 0
            ? [{ name, minutes }]
            : [];
        })
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 10),
    [globalData],
  );

  const topScorerData = useMemo(
    () =>
      (globalData.topScorer || [])
        .flatMap((item) => {
          const name = getText(item, ["player", "player_name", "name"]);
          const goals = getNumber(item, ["goals", "total_goals", "goal_count"]);
          const goalsPer90 = getNumber(item, [
            "goals_per90",
            "goals_per_90",
            "goalsPer90",
          ]);

          return name !== "Unknown" && goals !== null && goals > 0
            ? [{ name, goals, goalsPer90 }]
            : [];
        })
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 10),
    [globalData],
  );

  const topScoringTeamsData = useMemo(
    () =>
      (globalData.topScoringTeams || []).flatMap((item) => {
        const name = getText(item, ["team", "team_name", "name"]);
        const goals = getNumber(item, ["goals", "total_goals", "team_goals"]);
        const goalsPer90 = getNumber(item, [
          "goals_per_90",
          "goalsPer90",
          "goals90",
          "goals_per90",
        ]);

        return name !== "Unknown" && (goals !== null || goalsPer90 !== null)
          ? [{ name, goals, goalsPer90 }]
          : [];
      }),
    [globalData],
  );

  const sortedTeamsByGoals = useMemo(
    () =>
      topScoringTeamsData
        .flatMap((team) =>
          team.goals !== null
            ? [{ name: team.name, goals: team.goals, goalsPer90: team.goalsPer90 }]
            : [],
        )
        .sort((a, b) => b.goals - a.goals),
    [topScoringTeamsData],
  );

  const teamScatterData = useMemo(
    (): TeamPoint[] =>
      topScoringTeamsData.flatMap((team) =>
        team.goals !== null && team.goalsPer90 !== null
          ? [{ name: team.name, goals: team.goals, goalsPer90: team.goalsPer90 }]
          : [],
      ),
    [topScoringTeamsData],
  );

  /* ---------- PREDICTION DATA ---------- */

  const accuracyByStageData = useMemo(
    (): StageAccuracy[] =>
      (predictionData.accuracyByStage || []).flatMap((item) => {
        const accuracy = getNumber(item, [
          "accuracy",
          "accuracy_percentage",
          "percentage",
        ]);

        return accuracy !== null && accuracy >= 0
          ? [
              {
                stage: `Type ${getText(item, ["match_type", "stage", "type"])}`,
                accuracy,
              },
            ]
          : [];
      }),
    [predictionData],
  );

  const actualScores = useMemo(
    () => buildScoreTable(predictionData.actualHeatmap || []),
    [predictionData],
  );

  const predictedScores = useMemo(
    () => buildScoreTable(predictionData.predictionHeatmap || []),
    [predictionData],
  );

  const actualHeatmapData = useMemo(
    () =>
      (predictionData.actualHeatmap || [])
        .map((item) => ({
          score: getScoreLabel(item),
          occurrences: getNumber(item, [
            "timesOccurred",
            "times_occurred",
            "occurrences",
            "count",
          ]),
        }))
        .filter(
          (item) =>
            item.score !== "Unknown" &&
            item.occurrences !== null &&
            item.occurrences > 0,
        )
        .sort((a, b) => (b.occurrences ?? 0) - (a.occurrences ?? 0))
        .slice(0, 20),
    [predictionData],
  );

  const predictionHeatmapData = useMemo(
    () =>
      (predictionData.predictionHeatmap || [])
        .map((item) => ({
          score: getScoreLabel(item),
          predictions: getNumber(item, [
            "timesPredicted",
            "times_predicted",
            "predictions",
            "count",
          ]),
        }))
        .filter(
          (item) =>
            item.score !== "Unknown" &&
            item.predictions !== null &&
            item.predictions > 0,
        )
        .sort((a, b) => (b.predictions ?? 0) - (a.predictions ?? 0))
        .slice(0, 20),
    [predictionData],
  );

  const confidenceData = useMemo(
    (): ConfidencePoint[] =>
      (predictionData.confidenceVsAccuracy || []).flatMap((item) => {
        const confidence = getNumber(item, [
          "consensus",
          "confidence",
          "consensus_percentage",
        ]);
        const accuracy = getNumber(item, ["accuracy", "accuracy_percentage"]);

        if (confidence === null || accuracy === null) {
          return [];
        }

        return [
          {
            match: getText(item, ["match", "match_name"], "Match"),
            confidence,
            accuracy,
            predictions: getNumber(item, [
              "totalPredictions",
              "total_predictions",
            ]),
            crowdPick: getText(item, ["consensusOutcome"], "") || null,
            actualOutcome: getText(item, ["actual_outcome", "actualOutcome"], "") || null,
          },
        ];
      }),
    [predictionData],
  );

  const winnerData = useMemo(
    (): WinnerRow[] =>
      (predictionData.tournamentWinnerPredictions || [])
        .flatMap((item) => {
          const name = getText(item, ["team", "team_name", "winner", "name"]);
          const predictions = getNumber(item, [
            "picks",
            "predictions",
            "count",
            "timesPredicted",
          ]);

          return name !== "Unknown" && predictions !== null && predictions > 0
            ? [
                {
                  name,
                  predictions,
                  percent: getNumber(item, ["pickPercent", "pick_percent"]),
                },
              ]
            : [];
        })
        .sort((a, b) => b.predictions - a.predictions),
    [predictionData],
  );

  const predictedVsActualGoalsData = useMemo(
    (): TeamGoals[] =>
      (predictionData.biasedFan || []).flatMap((item) => {
        const name = getText(item, ["team_name", "team", "name"]);
        const predicted = getNumber(item, [
          "predictedGoals",
          "predicted_goals",
          "predicted",
        ]);
        const actual = getNumber(item, [
          "actualGoals",
          "actual_goals",
          "actual",
        ]);

        return name !== "Unknown" && predicted !== null && actual !== null
          ? [{ name, predicted, actual }]
          : [];
      }),
    [predictionData],
  );

  const scorePsychologyData = useMemo(
    (): ScorePsychRow[] =>
      (predictionData.scorePsychology || [])
        .flatMap((item) => {
          const score = getScoreLabel(item);
          const predicted = getNumber(item, [
            "timesPredicted",
            "times_predicted",
            "predictions",
          ]);
          const actual = getNumber(item, [
            "timesOccurred",
            "times_occurred",
            "occurrences",
          ]);

          return score !== "Unknown" && predicted !== null && actual !== null
            ? [{ score, predicted, actual }]
            : [];
        })
        .sort((a, b) => b.predicted - a.predicted),
    [predictionData],
  );

  /* ---------- DERIVED METRICS (all computed from the data above) ---------- */

  const goalStats = useMemo(() => {
    let totalGoals = 0;
    const byTotal = new Map<number, number>();

    actualScores.map.forEach((count, key) => {
      const parsed = parseScore(key);

      if (!parsed) {
        return;
      }

      const goals = parsed[0] + parsed[1];

      totalGoals += goals * count;
      byTotal.set(goals, (byTotal.get(goals) ?? 0) + count);
    });

    if (actualScores.total === 0) {
      return null;
    }

    const maxTotal = Math.max(...Array.from(byTotal.keys()), 0);
    const distribution = Array.from({ length: maxTotal + 1 }, (_, goals) => ({
      name: String(goals),
      matches: byTotal.get(goals) ?? 0,
    }));

    let modeGoals = 0;
    let modeCount = -1;

    byTotal.forEach((count, goals) => {
      if (count > modeCount) {
        modeCount = count;
        modeGoals = goals;
      }
    });

    let threePlus = 0;

    byTotal.forEach((count, goals) => {
      if (goals >= 3) {
        threePlus += count;
      }
    });

    return {
      average: totalGoals / actualScores.total,
      distribution,
      modeGoals,
      modeCount,
      threePlusShare: (threePlus / actualScores.total) * 100,
    };
  }, [actualScores]);

  const outcomeAccuracy = useMemo(
    () => (confidenceData.length > 0 ? weightedAccuracy(confidenceData) : null),
    [confidenceData],
  );

  const mostCommonActual = useMemo(() => {
    let best: { key: string; count: number } | null = null;

    actualScores.map.forEach((count, key) => {
      if (!best || count > best.count) {
        best = { key, count };
      }
    });

    return best as { key: string; count: number } | null;
  }, [actualScores]);

  const keyInsights = useMemo((): InsightStat[] => {
    const items: InsightStat[] = [];

    if (mostCommonActual) {
      const parsed = parseScore(mostCommonActual.key);

      if (parsed) {
        items.push({
          value: mostCommonActual.count,
          label: `matches ended ${mostCommonActual.key}`,
          sub: "The most common final score",
        });
      }
    }

    const club = clubCountsData[0];

    if (club) {
      items.push({
        value: club.count,
        label: `players came from ${club.name}`,
        sub: "The club with the most players at the tournament",
      });
    }

    const diverse = clubDiversityData[0];

    if (diverse) {
      items.push({
        value: diverse.diversity,
        label: `different clubs in ${diverse.name}'s squad`,
        sub: "The widest club representation",
      });
    }

    const minutes = topMinutesData[0];

    if (minutes) {
      items.push({
        value: minutes.minutes,
        suffix: " min",
        label: `played by ${minutes.name}`,
        sub: "The most playing time at the tournament",
      });
    }

    return items;
  }, [mostCommonActual, clubCountsData, clubDiversityData, topMinutesData]);

  /* ---------- GUESS SETUPS ---------- */

  const attendanceGuess = useMemo(
    () =>
      buildGuessOptions(
        attendeesData,
        (item) => item.name,
        (item) => item.attendance,
      ),
    [attendeesData],
  );

  const topScorerGuess = useMemo(
    () =>
      buildGuessOptions(
        topScorerData,
        (item) => item.name,
        (item) => item.goals,
      ),
    [topScorerData],
  );

  const topTeamGuess = useMemo(
    () =>
      buildGuessOptions(
        sortedTeamsByGoals,
        (item) => item.name,
        (item) => item.goals,
      ),
    [sortedTeamsByGoals],
  );

  const guessKeys = useMemo(() => {
    const keys: string[] = [];

    if (attendanceGuess) {
      keys.push("attendance");
    }

    if (goalStats) {
      keys.push("avgGoals");
    }

    if (topScorerGuess) {
      keys.push("topScorer");
    }

    if (topTeamGuess) {
      keys.push("topTeam");
    }

    return keys;
  }, [attendanceGuess, goalStats, topScorerGuess, topTeamGuess]);

  const guessIndex = (key: string) => guessKeys.indexOf(key) + 1;
  const nextGuessId = (key: string) => {
    const next = guessKeys[guessKeys.indexOf(key) + 1];

    return next ? `guess-${next}` : "global";
  };
  const nextGuessLabel = (key: string) =>
    guessKeys.indexOf(key) === guessKeys.length - 1
      ? "Explore the global data"
      : "Next prediction";

  /* ---------- DATA-DRIVEN INSIGHT COPY ---------- */

  const attendanceInsight = useMemo(() => {
    if (attendeesData.length < 2) {
      return undefined;
    }

    const [first, second] = attendeesData;
    const pct = Math.round(
      ((first.attendance - second.attendance) / second.attendance) * 100,
    );

    return `${first.name} welcomed ${pct}% more fans than ${second.name} over the tournament. Across all ${attendeesAll.count} venues, ${nf(attendeesAll.total)} fans attended.`;
  }, [attendeesData, attendeesAll]);

  const avgGoalsInsight = useMemo(() => {
    if (!goalStats) {
      return undefined;
    }

    return `The most common match had ${goalStats.modeGoals} goals (${goalStats.modeCount} of ${actualScores.total} matches), and ${nf(goalStats.threePlusShare, 0)}% of matches had three or more goals.`;
  }, [goalStats, actualScores]);

  const scorerInsight = useMemo(() => {
    if (topScorerData.length < 2) {
      return undefined;
    }

    const [first, second] = topScorerData;
    const rate =
      first.goalsPer90 !== null
        ? `, at ${nf(first.goalsPer90, 2)} goals per 90 minutes`
        : "";

    return `${first.name} scored ${nf(first.goals - second.goals)} more ${first.goals - second.goals === 1 ? "goal" : "goals"} than ${second.name}${rate}.`;
  }, [topScorerData]);

  const teamInsight = useMemo(() => {
    if (sortedTeamsByGoals.length < 2) {
      return undefined;
    }

    const [first, second] = sortedTeamsByGoals;

    if (first.goals === second.goals) {
      return `${first.name} and ${second.name} finished level on ${first.goals} goals, ${
        first.goalsPer90 !== null && second.goalsPer90 !== null
          ? `but their scoring rates differed: ${nf(first.goalsPer90, 2)} vs ${nf(second.goalsPer90, 2)} goals per 90 minutes`
          : ""
      }.`;
    }

    return `${first.name} scored ${first.goals - second.goals} more than ${second.name}.`;
  }, [sortedTeamsByGoals]);

  const finalInsights = useMemo((): FinalInsight[] => {
    const items: FinalInsight[] = [];
    const topPsych = scorePsychologyData[0];

    if (topPsych && predictedScores.total > 0 && actualScores.total > 0) {
      items.push({
        big: topPsych.score,
        title: "The crowd's favourite scoreline",
        body: `Fans predicted ${topPsych.score} ${nf(topPsych.predicted)} times (${nf((topPsych.predicted / predictedScores.total) * 100, 1)}% of all predictions). It actually happened ${nf(topPsych.actual)} times (${nf((topPsych.actual / actualScores.total) * 100, 1)}% of matches).`,
      });
    }

    const over = [...predictedVsActualGoalsData].sort(
      (a, b) => b.predicted - b.actual - (a.predicted - a.actual),
    )[0];

    if (over && over.predicted > over.actual) {
      items.push({
        big: `+${nf(over.predicted - over.actual, 1)}`,
        title: `${over.name}, the most overestimated team`,
        body: `Fans predicted ${nf(over.predicted, 2)} goals, but the team delivered ${nf(over.actual, 2)}.`,
      });
    }

    const under = [...predictedVsActualGoalsData].sort(
      (a, b) => b.actual - b.predicted - (a.actual - a.predicted),
    )[0];

    if (under && under.actual > under.predicted) {
      items.push({
        big: `+${nf(under.actual - under.predicted, 1)}`,
        title: `${under.name}, the most underestimated team`,
        body: `Fans predicted ${nf(under.predicted, 2)} goals, but the team delivered ${nf(under.actual, 2)}.`,
      });
    }

    const misled = [...confidenceData].sort(
      (a, b) => a.accuracy - b.accuracy || b.confidence - a.confidence,
    )[0];

    if (misled && misled.accuracy < 50) {
      items.push({
        big: `${nf(misled.confidence, 0)}%`,
        title: "Confident and wrong",
        body: `${nf(misled.confidence, 0)}% of fans agreed on ${misled.match}, yet only ${nf(misled.accuracy, 0)}% called the outcome correctly.`,
      });
    }

    return items;
  }, [
    scorePsychologyData,
    predictedScores,
    actualScores,
    predictedVsActualGoalsData,
    confidenceData,
  ]);

  const hasWinners = winnerData.length > 0;

  return (
    <GuessScoreProvider order={guessKeys}>
      <div className="wc-root relative isolate w-full overflow-x-clip bg-[#070D13] text-slate-200">
        <style>{GLOBAL_CSS}</style>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(8,170,165,0.20),transparent_55%),radial-gradient(ellipse_at_80%_30%,rgba(20,121,168,0.12),transparent_50%),radial-gradient(ellipse_at_10%_75%,rgba(8,170,165,0.08),transparent_50%)]"
        />


        <div className="mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-14 xl:px-20">
          <AnalyticsHero />
          <KeyInsights items={keyInsights} />

          {/* ---------------- CAN YOU GUESS? ---------------- */}
          {guessKeys.length > 0 && (
            <section id="guess" className="scroll-mt-6 py-24 sm:py-32 lg:py-40">
              <SectionHeading
                eyebrow="Part 1"
                title="Can you guess?"
                description={`${guessKeys.length} predictions before the data appears. Lock in an answer and the real numbers unfold.`}
              />

              <div className="space-y-12 sm:space-y-20">
                {attendanceGuess && attendeesData.length > 0 && (
                  <GuessMoment
                    id="guess-attendance"
                    guessKey="attendance"
                    index={guessIndex("attendance")}
                    total={guessKeys.length}
                    question="Which stadium welcomed the most fans over the whole tournament?"
                    helper="Total recorded attendance across all matches at each venue."
                    options={attendanceGuess.options}
                    correctIds={attendanceGuess.correctIds}
                    correctNames={attendanceGuess.correctNames}
                    optionValues={attendanceGuess.values}
                    formatValue={(n) => `${nf(n)} fans`}
                    resultTitle={attendanceGuess.correctNames.join(" & ")}
                    resultValue={attendeesData[0].attendance}
                    resultValueLabel="fans over the tournament"
                    insight={attendanceInsight}
                    nextId={nextGuessId("attendance")}
                    nextLabel={nextGuessLabel("attendance")}
                  >
                    {(ctx) => (
                      <RankedBarChart
                        data={attendeesData}
                        series={[
                          {
                            key: "attendance",
                            name: "Attendance",
                            color: COLORS.blue,
                          },
                        ]}
                        highlight={[...ctx.correctNames, ctx.selectedLabel].filter(Boolean)}
                        cellColor={guessCellColor(ctx)}
                        showReadout={false}
                      />
                    )}
                  </GuessMoment>
                )}

                {goalStats && (
                  <SliderGuessMoment
                    id="guess-avgGoals"
                    guessKey="avgGoals"
                    index={guessIndex("avgGoals")}
                    total={guessKeys.length}
                    question="How many goals do you think were scored per match, on average?"
                    helper="Worked out from every recorded final score."
                    min={0}
                    max={Math.max(5, Math.ceil(goalStats.average))}
                    step={0.1}
                    initial={2.5}
                    actual={goalStats.average}
                    unit="goals per match"
                    tolerance={0.25}
                    insight={avgGoalsInsight}
                    nextId={nextGuessId("avgGoals")}
                    nextLabel={nextGuessLabel("avgGoals")}
                  >
                    <div>
                      <p className="mb-4 text-sm text-slate-400">
                        How many matches ended with each total number of goals
                      </p>
                      <RankedBarChart
                        data={goalStats.distribution}
                        orientation="columns"
                        series={[
                          {
                            key: "matches",
                            name: "Matches",
                            color: COLORS.teal,
                          },
                        ]}
                        xLabel="Goals in a match"
                        tooltipTitle={(row) => `${row.name} goals in a match`}
                        height={420}
                      />
                    </div>
                  </SliderGuessMoment>
                )}

                {topScorerGuess && topScorerData.length > 0 && (
                  <GuessMoment
                    id="guess-topScorer"
                    guessKey="topScorer"
                    index={guessIndex("topScorer")}
                    total={guessKeys.length}
                    question="Who found the net more than anyone else in the tournament?"
                    options={topScorerGuess.options}
                    correctIds={topScorerGuess.correctIds}
                    correctNames={topScorerGuess.correctNames}
                    optionValues={topScorerGuess.values}
                    formatValue={(n) => `${nf(n)} goals`}
                    resultTitle={topScorerGuess.correctNames.join(" & ")}
                    resultValue={topScorerData[0].goals}
                    resultValueLabel="goals"
                    insight={scorerInsight}
                    nextId={nextGuessId("topScorer")}
                    nextLabel={nextGuessLabel("topScorer")}
                  >
                    {(ctx) => (
                      <RankedBarChart
                        data={topScorerData}
                        series={[
                          {
                            key: "goals",
                            name: "Goals",
                            color: COLORS.blue,
                          },
                        ]}
                        highlight={[...ctx.correctNames, ctx.selectedLabel].filter(Boolean)}
                        cellColor={guessCellColor(ctx)}
                        showReadout={false}
                      />
                    )}
                  </GuessMoment>
                )}

                {topTeamGuess && sortedTeamsByGoals.length > 0 && (
                  <GuessMoment
                    id="guess-topTeam"
                    guessKey="topTeam"
                    index={guessIndex("topTeam")}
                    total={guessKeys.length}
                    question="Which team scored the most goals across the whole tournament?"
                    helper="If two teams finish level, either one counts."
                    options={topTeamGuess.options}
                    correctIds={topTeamGuess.correctIds}
                    correctNames={topTeamGuess.correctNames}
                    optionValues={topTeamGuess.values}
                    formatValue={(n) => `${nf(n)} goals`}
                    resultTitle={topTeamGuess.correctNames.join(" & ")}
                    resultValue={sortedTeamsByGoals[0].goals}
                    resultValueLabel="total goals"
                    insight={teamInsight}
                    nextId={nextGuessId("topTeam")}
                    nextLabel={nextGuessLabel("topTeam")}
                  >
                    {(ctx) =>
                      teamScatterData.length === 0 ? (
                        <EmptyChartMessage message="No valid team-scoring data was found." />
                      ) : (
                        <div>
                          <p className="mb-4 text-sm text-slate-400">
                            Total goals vs goals per 90 minutes
                          </p>
                          <TeamGoalsScatter
                            data={teamScatterData}
                            correct={ctx.correctNames}
                            pick={ctx.selectedLabel}
                          />
                        </div>
                      )
                    }
                  </GuessMoment>
                )}
              </div>
            </section>
          )}

          {/* ---------------- GLOBAL FOOTBALL DATA ---------------- */}
          <section id="global" className="scroll-mt-6 py-24 sm:py-32 lg:py-40">
            <SectionHeading
              eyebrow="Part 2"
              title="The global football picture"
              description="Squads, clubs, referees and minutes. Click any bar to focus on it."
            />

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:gap-10">
              <ChartPanel
                title="Players by club"
                description="The clubs with the highest number of represented players."
              >
                {clubCountsData.length === 0 ? (
                  <EmptyChartMessage message="No valid club-count data was found." />
                ) : (
                  <RankedBarChart
                    data={clubCountsData}
                    series={[
                      { key: "count", name: "Players", color: COLORS.blue },
                    ]}
                  />
                )}
              </ChartPanel>

              <ChartPanel
                title="Club diversity by national team"
                description="National teams ranked by the number of unique clubs represented in their squads."
              >
                {clubDiversityData.length === 0 ? (
                  <EmptyChartMessage message="No valid club-diversity data was found." />
                ) : (
                  <RankedBarChart
                    data={clubDiversityData}
                    series={[
                      {
                        key: "diversity",
                        name: "Unique clubs",
                        color: COLORS.teal,
                      },
                    ]}
                  />
                )}
              </ChartPanel>

              <ChartPanel
                title="Referee cards"
                description="Yellow and red cards shown by each referee."
              >
                {refereeCardsData.length === 0 ? (
                  <EmptyChartMessage message="No valid referee card data was found." />
                ) : (
                  <RankedBarChart
                    data={refereeCardsData}
                    stacked
                    series={[
                      {
                        key: "yellow",
                        name: "Yellow cards",
                        color: COLORS.yellowCard,
                      },
                      { key: "red", name: "Red cards", color: COLORS.redCard },
                    ]}
                  />
                )}
              </ChartPanel>

              <ChartPanel
                title="Player playing time"
                description="Players with the highest recorded playing time."
              >
                {topMinutesData.length === 0 ? (
                  <EmptyChartMessage message="No valid playing-time data was found." />
                ) : (
                  <RankedBarChart
                    data={topMinutesData}
                    series={[
                      {
                        key: "minutes",
                        name: "Minutes",
                        color: COLORS.blue,
                      },
                    ]}
                  />
                )}
              </ChartPanel>
            </div>
          </section>

          {/* ---------------- INSIDE THE PREDICTION MIND ---------------- */}
          <section id="fans" className="scroll-mt-6 py-24 sm:py-32 lg:py-40">
            <SectionHeading
  eyebrow="Part 3 · The sports club prediction tournament"
  title="Inside the Prediction Game"
  description="At the DWIT sports club's prediction tournament, participants predicted match outcomes, backed their picks, and tested their instincts. Explore how accurate their predictions were, how confident they felt, and which teams they expected to win."
/>

            <Reveal className="mb-12 grid grid-cols-2 gap-x-6 gap-y-10 border-y border-white/10 py-10 sm:mb-20 xl:grid-cols-4">
              {predictedScores.total > 0 && (
                <StatHighlight
                  value={predictedScores.total}
                  label="scoreline predictions"
                  sub="Submitted in the tournament"
                />
              )}
              {confidenceData.length > 0 && (
                <StatHighlight
                  value={confidenceData.length}
                  label="matches predicted"
                  color={COLORS.sky}
                />
              )}
              {hasWinners && (
                <StatHighlight
                  value={winnerData.reduce((sum, d) => sum + d.predictions, 0)}
                  label="tournament winner picks"
                />
              )}
              {outcomeAccuracy !== null && (
                <StatHighlight
                  value={outcomeAccuracy}
                  decimals={1}
                  suffix="%"
                  label="called the right outcome"
                  color={COLORS.sky}
                />
              )}
            </Reveal>
{/* 
            <div className="space-y-12 sm:space-y-20">
              {accuracyByStageData.length > 0 && (
                <Reveal>
                  <Panel>
                    <ExplorerTitle
                      eyebrow="Accuracy explorer"
                      title="How accurate were the predictions?"
                      description="Switch between match types to see how predictable each one was."
                    />
                    <AccuracyExplorer data={accuracyByStageData} />
                  </Panel>
                </Reveal>
              )}

              {confidenceData.length > 0 && (
                <Reveal>
                  <Panel>
                    <ExplorerTitle
                      eyebrow="Confidence explorer"
                      title="Does a confident crowd get it right?"
                      description="Slide through the levels of crowd agreement and watch how accuracy responds. Accuracy is weighted by the number of predictions per match."
                    />
                    <ConfidenceExplorer data={confidenceData} />
                  </Panel>
                </Reveal>
              )}

              {hasWinners && (
                <Reveal>
                  <Panel>
                    <ExplorerTitle
                      eyebrow="Winner picks"
                      title="Who did fans back to win it all?"
                      description="Select a team to see its share of the vote and how it stacked up against the favourite."
                    />
                    <WinnerExplorer data={winnerData} />
                  </Panel>
                </Reveal>
              )}
            </div> */}
          </section>

          {/* ---------------- PREDICTION LAB ---------------- */}
          <section id="lab" className="scroll-mt-6 py-24 sm:py-32 lg:py-40">
            <SectionHeading
              eyebrow="Part 4"
              title="The prediction lab"
              description="Now it's your turn. Build a scoreline, then predict a team's goals, and see how you compare with the college crowd and with reality."
            />

            <div className="space-y-12 sm:space-y-20">
              {predictedScores.total > 0 && actualScores.total > 0 && (
                <Reveal>
                  <Panel>
                    <ExplorerTitle
                      eyebrow="Predict the score"
                      title="How likely was your scoreline?"
                      description="Move the sliders to compare how often fans predicted a scoreline with how often it really happened."
                    />
                    <ScorelineLab
                      predicted={predictedScores}
                      actual={actualScores}
                    />
                  </Panel>
                </Reveal>
              )}

              {predictedVsActualGoalsData.length > 0 && (
                <Reveal>
                  <Panel>
                    <ExplorerTitle
                      eyebrow="Predicted goals vs actual goals"
                      title="Can you out-predict the crowd?"
                      description="Pick a team, guess its average goals, then reveal what fans predicted and what actually happened."
                    />
                    <GoalsLab data={predictedVsActualGoalsData} />
                  </Panel>
                </Reveal>
              )}
            </div>
          </section>

          {/* ---------------- PREDICTED VS ACTUAL ---------------- */}
          <section id="versus" className="scroll-mt-6 py-24 sm:py-32 lg:py-40">
            <SectionHeading
              eyebrow="Part 5"
              title="Predicted vs actual"
              description="The full scoreline picture: what happened, what the college expected, and where psychology got in the way."
            />

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:gap-10">
              <ChartPanel
                title="Actual scoreline distribution"
                description="How often each final score actually occurred."
              >
                {actualHeatmapData.length === 0 ? (
                  <EmptyChartMessage message="No valid actual scoreline data was found." />
                ) : (
                  <RankedBarChart
                    data={actualHeatmapData}
                    nameKey="score"
                    orientation="columns"
                    series={[
                      {
                        key: "occurrences",
                        name: "Actual occurrences",
                        color: COLORS.teal,
                      },
                    ]}
                  />
                )}
              </ChartPanel>

              <ChartPanel
                title="Predicted scoreline distribution"
                description="How often each scoreline was predicted by fans."
              >
                {predictionHeatmapData.length === 0 ? (
                  <EmptyChartMessage message="No valid predicted scoreline data was found." />
                ) : (
                  <RankedBarChart
                    data={predictionHeatmapData}
                    nameKey="score"
                    orientation="columns"
                    series={[
                      {
                        key: "predictions",
                        name: "Predictions",
                        color: COLORS.sky,
                      },
                    ]}
                  />
                )}
              </ChartPanel>
            </div>

            {scorePsychologyData.length > 0 && (
              <div className="mt-8 xl:mt-10">
                <ChartPanel
                  title="Predicted scorelines vs actual occurrences"
                  description="The ten scorelines fans predicted most, set against how often they really happened."
                >
                  <ScorePsychologyPanel
                    data={scorePsychologyData}
                    predictedTotal={predictedScores.total}
                    actualTotal={actualScores.total}
                  />
                </ChartPanel>
              </div>
            )}
          </section>

          {/* ---------------- FINAL INSIGHTS ---------------- */}
          {finalInsights.length > 0 && (
            <section id="final" className="scroll-mt-6 pb-32 pt-24 sm:pb-44 sm:pt-32">
              <SectionHeading
                eyebrow="The takeaway"
                title="What the data says"
                description="What the predictions taught us about how fans see football."
              />
              <FinalInsights items={finalInsights} />
            </section>
          )}
        </div>
      </div>
    </GuessScoreProvider>
  );
}

/* =====================================================================
 * LOADER — owns fetching and the loading / error states, then hands real
 * data to AnalyticsContent (so hook order can never change between renders)
 * ===================================================================== */

export default function WorldCupAnalytics() {
  const [globalData, setGlobalData] = useState<Record<string, DataRecord[]>>(
    {},
  );

  const [predictionData, setPredictionData] = useState<
    Record<string, DataRecord[]>
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const files = {
          attendees: "/data/worldcup/global/attendees.json",
          clubCounts: "/data/worldcup/global/club_counts.json",
          clubDiversity: "/data/worldcup/global/club_diversity.json",
          refereeCards: "/data/worldcup/global/referee_cards.json",
          topMinutes: "/data/worldcup/global/top_minutes.json",
          topScorer: "/data/worldcup/global/top_scorer.json",
          topScoringTeams: "/data/worldcup/global/top_scoring_teams.json",

          accuracyByStage: "/data/worldcup/prediction/accuracy_by_stage.json",
          actualHeatmap: "/data/worldcup/prediction/actual_heatmap.json",
          predictionHeatmap:
            "/data/worldcup/prediction/prediction_heatmap.json",
          confidenceVsAccuracy:
            "/data/worldcup/prediction/confidence_vs_accuracy.json",
          tournamentWinnerPredictions:
            "/data/worldcup/prediction/tournament_winner_predictions.json",
          biasedFan: "/data/worldcup/prediction/biased_fan.json",
          scorePsychology: "/data/worldcup/prediction/score_psychology.json",
        };

        const loadedEntries = await Promise.all(
          Object.entries(files).map(async ([key, path]) => {
            const response = await fetch(path);

            if (!response.ok) {
              throw new Error(
                `Could not load ${path}. HTTP status: ${response.status}`,
              );
            }

            const json = await response.json();

            return [key, normalizeArray(json)] as const;
          }),
        );

        if (cancelled) {
          return;
        }

        const loaded = Object.fromEntries(loadedEntries);

        setGlobalData({
          attendees: loaded.attendees,
          clubCounts: loaded.clubCounts,
          clubDiversity: loaded.clubDiversity,
          refereeCards: loaded.refereeCards,
          topMinutes: loaded.topMinutes,
          topScorer: loaded.topScorer,
          topScoringTeams: loaded.topScoringTeams,
        });

        setPredictionData({
          accuracyByStage: loaded.accuracyByStage,
          actualHeatmap: loaded.actualHeatmap,
          predictionHeatmap: loaded.predictionHeatmap,
          confidenceVsAccuracy: loaded.confidenceVsAccuracy,
          tournamentWinnerPredictions: loaded.tournamentWinnerPredictions,
          biasedFan: loaded.biasedFan,
          scorePsychology: loaded.scorePsychology,
        });
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load World Cup analytics data.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-lg border border-[var(--tertiary)] bg-[var(--background)] p-10 text-lg text-slate-300">
        Loading World Cup analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-10 text-lg text-red-200">
        {error}
      </div>
    );
  }

  return (
    <AnalyticsContent globalData={globalData} predictionData={predictionData} />
  );
}