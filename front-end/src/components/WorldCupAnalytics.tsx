"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type DataRecord = Record<string, any>;

type ChartCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function ChartCard({ title, description, children }: ChartCardProps) {
  return (
    <section className="rounded-2xl border border-[#12577A] bg-[#0F1A23] p-5 shadow-lg">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-white">{title}</h2>

        <p className="mt-2 text-sm leading-6 text-slate-300">
          {description}
        </p>
      </div>

      <div className="h-[350px] w-full">{children}</div>
    </section>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-[#08AAA5]">{title}</h1>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
        {description}
      </p>
    </div>
  );
}

function EmptyChartMessage({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[#12577A] p-6 text-center text-sm leading-6 text-slate-300">
      {message}
    </div>
  );
}

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
 *  ("2-1"), others store it as two separate goal fields (goal1/goal2).
 *  This tries the string form first, then falls back to building one
 *  from the numeric fields, so both shapes render correctly. */
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

/*
 * ---------------------------------------------------------------------
 * GUESSING-GAME HELPERS
 *
 * Everything below builds "Can you guess?" moments strictly out of the
 * same arrays the charts already use. Nothing here invents a fact,
 * a name, or a number that isn't present in the fetched data.
 * ---------------------------------------------------------------------
 */

function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

type GuessOption = { id: string; label: string };

type GuessSetup<T> = {
  options: GuessOption[];
  correctId: string;
  correctItem: T;
};

/** Takes an already-sorted-descending list and turns its top entries
 *  into a shuffled multiple-choice set. The correct answer is always
 *  the #1 item in the source data — it's just shown in a random slot. */
function buildGuessOptions<T>(
  sortedDesc: T[],
  labelFn: (item: T) => string,
  count = 4,
): GuessSetup<T> | null {
  const top = sortedDesc.slice(0, Math.min(count, sortedDesc.length));

  if (top.length < 2) {
    return null;
  }

  const withIds = top.map((item, i) => ({
    id: `opt-${i}`,
    label: labelFn(item),
    item,
  }));

  const shuffled = shuffleArray(withIds);

  return {
    options: shuffled.map(({ id, label }) => ({ id, label })),
    correctId: "opt-0",
    correctItem: top[0],
  };
}

/** Animates a number from 0 up to `target` once `trigger` flips true. */
function useCountUp(target: number, trigger: boolean, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!trigger) {
      return;
    }

    let startTime: number | null = null;
    let frame: number;

    const step = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setValue(target * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };

    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [trigger, target, duration]);

  return value;
}

function GuessMoment({
  index,
  total,
  question,
  helper,
  options,
  correctId,
  resultTitle,
  resultValue,
  resultValueLabel,
  resultDecimals = 0,
  insight,
  onAnswered,
  children,
}: {
  index: number;
  total: number;
  question: string;
  helper?: string;
  options: GuessOption[];
  correctId: string;
  resultTitle: string;
  resultValue: number;
  resultValueLabel: string;
  resultDecimals?: number;
  insight?: string;
  onAnswered?: (correct: boolean) => void;
  children: React.ReactNode | ((selectedId: string) => React.ReactNode);
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealChart, setRevealChart] = useState(false);

  const answered = selectedId !== null;
  const isCorrect = selectedId === correctId;
  const animatedValue = useCountUp(resultValue, answered, 1000);

  function handleSelect(id: string) {
    if (answered) {
      return;
    }

    setSelectedId(id);
    onAnswered?.(id === correctId);
    window.setTimeout(() => setRevealChart(true), 550);
  }

  return (
    <div className="rounded-2xl border border-[#12577A] bg-gradient-to-b from-[#0F1A23] to-[#0B141C] p-6 shadow-lg sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#08AAA5]/60 text-sm font-semibold text-[#08AAA5]">
          {String(index).padStart(2, "0")}
        </span>

        <p className="text-sm text-slate-400">
          Prediction {index} of {total}
        </p>
      </div>

      <h3 className="max-w-xl text-xl font-semibold leading-snug text-white sm:text-2xl">
        {question}
      </h3>

      {helper && (
        <p className="mt-2 max-w-xl text-sm text-slate-400">{helper}</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          const isCorrectOption = option.id === correctId;

          let stateClasses =
            "border-[#12577A] bg-[#0B141C] text-slate-200 hover:border-[#08AAA5] hover:text-white";

          if (answered) {
            if (isCorrectOption) {
              stateClasses = "border-[#08AAA5] bg-[#08AAA5]/10 text-white";
            } else if (isSelected) {
              stateClasses = "border-red-500/70 bg-red-500/10 text-red-200";
            } else {
              stateClasses = "border-[#12577A]/40 bg-[#0B141C] text-slate-500";
            }
          }

          return (
            <button
              key={option.id}
              type="button"
              disabled={answered}
              onClick={() => handleSelect(option.id)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${stateClasses} ${
                answered ? "cursor-default" : "cursor-pointer active:scale-[0.98]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-6 border-t border-[#12577A]/60 pt-6">
          <p
            className={`text-sm font-semibold ${
              isCorrect ? "text-[#08AAA5]" : "text-red-300"
            }`}
          >
            {isCorrect ? "Spot on." : "Not quite."}
          </p>

          <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {resultTitle}
          </p>

          <p className="mt-1 text-lg text-slate-300">
            {resultDecimals > 0
              ? animatedValue.toFixed(resultDecimals)
              : Math.round(animatedValue).toLocaleString()}{" "}
            {resultValueLabel}
          </p>

          <div
            className={`mt-6 overflow-hidden transition-all duration-700 ease-out ${
              revealChart
                ? "max-h-[600px] translate-y-0 opacity-100"
                : "max-h-0 -translate-y-2 opacity-0"
            }`}
          >
            {typeof children === "function"
              ? selectedId
                ? children(selectedId)
                : null
              : children}
          </div>

          {insight && revealChart && (
            <p className="mt-4 text-sm leading-6 text-slate-400">{insight}</p>
          )}
        </div>
      )}
    </div>
  );
}

function AverageComparisonBar({
  guessRange,
  actual,
}: {
  guessRange: { label: string; low: number; high: number };
  actual: number;
}) {
  const guessMid = (guessRange.low + guessRange.high) / 2;
  const scaleMax = Math.max(actual, guessMid, 1) * 1.3;
  const guessPct = Math.min((guessMid / scaleMax) * 100, 100);
  const actualPct = Math.min((actual / scaleMax) * 100, 100);

  return (
    <div className="space-y-4 rounded-xl border border-dashed border-[#12577A] p-5">
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
          <span>Your guess</span>
          <span>{guessRange.label}</span>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-[#0B141C]">
          <div
            className="h-full rounded-full bg-[#1479A8] transition-all duration-700 ease-out"
            style={{ width: `${guessPct}%` }}
          />
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
          <span>Actual average</span>
          <span>{actual.toFixed(2)} goals / match</span>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-[#0B141C]">
          <div
            className="h-full rounded-full bg-[#08AAA5] transition-all duration-700 ease-out"
            style={{ width: `${actualPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function WorldCupAnalytics() {
  const [globalData, setGlobalData] = useState<Record<string, DataRecord[]>>(
    {},
  );

  const [predictionData, setPredictionData] = useState<
    Record<string, DataRecord[]>
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Score tracking for the guessing game — purely additive, never blocks
  // or gates the underlying data.
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  function recordAnswer(key: string, correct: boolean) {
    setAnswers((prev) => ({ ...prev, [key]: correct }));
  }

  useEffect(() => {
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

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load World Cup analytics data.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  /*
   * GLOBAL DATA
   *
   * attendeesData / topScorerData / topScoringTeamsData are memoized on
   * `globalData` (which is only set once, after the fetch resolves) so
   * that the guessing-game option order stays stable across re-renders
   * triggered by answering a guess elsewhere on the page.
   *
   * NOTE: every hook below (useMemo included) must run on every render,
   * loading/error states included — that's why the loading/error early
   * returns happen further down, after all hooks have been called, and
   * not up here. Bailing out early before a hook runs is what causes
   * React's "change in the order of Hooks" error.
   */

  const attendeesData = useMemo(
    () =>
      (globalData.attendees || [])
        .map((item) => ({
          name: getText(item, ["venue", "venue_name", "stadium", "name"]),
          attendance: getNumber(item, [
            "attendance",
            "attendees",
            "total_attendance",
            "total",
          ]),
        }))
        .filter(
          (item) =>
            item.name !== "Unknown" &&
            item.attendance !== null &&
            item.attendance > 0,
        )
        .sort((a, b) => (b.attendance ?? 0) - (a.attendance ?? 0))
        .slice(0, 10),
    [globalData],
  );

  const clubCountsData = (globalData.clubCounts || [])
    .map((item) => ({
      name: getText(item, ["club", "club_name", "team", "name"]),
      count: getNumber(item, ["count", "players", "player_count", "total"]),
    }))
    .filter(
      (item) =>
        item.name !== "Unknown" && item.count !== null && item.count > 0,
    )
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, 10);

  /*
   * FIXED CLUB DIVERSITY STRUCTURE

   {
     "team": "Switzerland",
     "unique_clubs_represented": 22
   }
   */

  const clubDiversityData = (globalData.clubDiversity || [])
    .map((item) => ({
      name: getText(item, [
        "team",
        "team_name",
        "national_team",
        "name",
      ]),
      diversity: getNumber(item, [
        "unique_clubs_represented",
        "unique_clubs",
        "club_diversity",
        "diversity",
        "count",
      ]),
    }))
    .filter(
      (item) =>
        item.name !== "Unknown" &&
        item.diversity !== null &&
        item.diversity > 0,
    )
    .sort((a, b) => (b.diversity ?? 0) - (a.diversity ?? 0))
    .slice(0, 15);

  /*
   * REFEREE CARD DATA

   Supports common possible structures such as:

   {
     "referee": "Name",
     "yellow_cards": 20,
     "red_cards": 2
   }

   or:

   {
     "referee": "Name",
     "yellow": 20,
     "red": 2
   }
   */

  const refereeCardsData = (globalData.refereeCards || [])
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
        name: getText(item, ["referee", "referee_name", "official", "name"]),
        yellow,
        red,
        total: yellow + red,
        matches,
      };
    })
    .filter((item) => item.name !== "Unknown" && item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  const topMinutesData = (globalData.topMinutes || [])
    .map((item) => ({
      name: getText(item, ["player", "player_name", "name"]),
      minutes: getNumber(item, [
        "minutes",
        "total_minutes",
        "playing_time",
      ]),
    }))
    .filter(
      (item) =>
        item.name !== "Unknown" &&
        item.minutes !== null &&
        item.minutes > 0,
    )
    .sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0))
    .slice(0, 10);

  const topScorerData = useMemo(
    () =>
      (globalData.topScorer || [])
        .map((item) => ({
          name: getText(item, ["player", "player_name", "name"]),
          goals: getNumber(item, ["goals", "total_goals", "goal_count"]),
        }))
        .filter(
          (item) =>
            item.name !== "Unknown" &&
            item.goals !== null &&
            item.goals > 0,
        )
        .sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))
        .slice(0, 10),
    [globalData],
  );

  const topScoringTeamsData = useMemo(
    () =>
      (globalData.topScoringTeams || [])
        .map((item) => ({
          name: getText(item, ["team", "team_name", "name"]),
          goals: getNumber(item, ["goals", "total_goals", "team_goals"]),
          goalsPer90: getNumber(item, [
            "goals_per_90",
            "goalsPer90",
            "goals90",
            "goals_per90",
          ]),
        }))
        .filter(
          (item) =>
            item.name !== "Unknown" &&
            (item.goals !== null || item.goalsPer90 !== null),
        ),
    [globalData],
  );

  const sortedTeamsByGoals = useMemo(
    () =>
      [...topScoringTeamsData]
        .filter((item) => item.goals !== null)
        .sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0)),
    [topScoringTeamsData],
  );

  /*
   * PREDICTION DATA
   */

  const accuracyByStageData = (predictionData.accuracyByStage || [])
    .map((item) => ({
      stage: `Type ${getText(item, ["match_type", "stage", "type"])}`,
      accuracy: getNumber(item, [
        "accuracy",
        "accuracy_percentage",
        "percentage",
      ]),
    }))
    .filter((item) => item.accuracy !== null && item.accuracy >= 0);

  /*
   * ACTUAL SCORELINE DATA

   Supports either a single "score" string, e.g. { "score": "2-1", "timesOccurred": 9 },
   or the goal1/goal2/count shape actually used by actual_heatmap.json:
   { "goal1": 2, "goal2": 1, "count": 9 }
   */

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

  /*
   * PREDICTED SCORELINE DATA

   Supports either a "score" string, e.g. { "score": "2-1", "timesPredicted": 403 },
   or the goal1/goal2/count shape actually used by prediction_heatmap.json:
   { "goal1": 2, "goal2": 1, "count": 403 }
   */

  const predictionHeatmapData = (predictionData.predictionHeatmap || [])
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
    .slice(0, 20);

  const confidenceData = (predictionData.confidenceVsAccuracy || [])
    .map((item) => ({
      confidence: getNumber(item, [
        "consensus",
        "confidence",
        "consensus_percentage",
      ]),
      accuracy: getNumber(item, ["accuracy", "accuracy_percentage"]),
    }))
    .filter((item) => item.confidence !== null && item.accuracy !== null);

  const winnerData = (predictionData.tournamentWinnerPredictions || [])
    .map((item) => ({
      name: getText(item, ["team", "team_name", "winner", "name"]),
      predictions: getNumber(item, [
        "picks",
        "predictions",
        "count",
        "timesPredicted",
      ]),
    }))
    .filter(
      (item) =>
        item.name !== "Unknown" &&
        item.predictions !== null &&
        item.predictions > 0,
    )
    .sort((a, b) => (b.predictions ?? 0) - (a.predictions ?? 0));

  /*
   * PREDICTED VS ACTUAL GOALS (per team)

   {
     "team_name": "South Korea",
     "predictedGoals": 1.717,
     "actualGoals": 0.217,
     "bias": 1.5
   }
   */

  const predictedVsActualGoalsData = (predictionData.biasedFan || [])
    .map((item) => ({
      name: getText(item, ["team_name", "team", "name"]),
      predicted: getNumber(item, [
        "predictedGoals",
        "predicted_goals",
        "predicted",
      ]),
      actual: getNumber(item, ["actualGoals", "actual_goals", "actual"]),
    }))
    .filter(
      (item) =>
        item.name !== "Unknown" &&
        item.predicted !== null &&
        item.actual !== null,
    );

  /*
   * PREDICTED SCORELINES VS ACTUAL OCCURRENCES

   {
     "score": "2-1",
     "timesPredicted": 403,
     "timesOccurred": 9
   }
   */

  const scorePsychologyData = (predictionData.scorePsychology || [])
    .map((item) => ({
      score: getScoreLabel(item),
      predicted: getNumber(item, [
        "timesPredicted",
        "times_predicted",
        "predictions",
      ]),
      actual: getNumber(item, [
        "timesOccurred",
        "times_occurred",
        "occurrences",
      ]),
    }))
    .filter(
      (item) =>
        item.score !== "Unknown" &&
        item.predicted !== null &&
        item.actual !== null,
    )
    .sort((a, b) => (b.predicted ?? 0) - (a.predicted ?? 0));

  /*
   * ---------------------------------------------------------------------
   * GUESS SETUPS — built strictly from the arrays above.
   * ---------------------------------------------------------------------
   */

  const attendanceGuess = useMemo(
    () => buildGuessOptions(attendeesData, (item) => item.name, 4),
    [attendeesData],
  );

  const topScorerGuess = useMemo(
    () => buildGuessOptions(topScorerData, (item) => item.name, 4),
    [topScorerData],
  );

  const topTeamGuess = useMemo(
    () => buildGuessOptions(sortedTeamsByGoals, (item) => item.name, 4),
    [sortedTeamsByGoals],
  );

  const avgGoalsGuess = useMemo(() => {
    const parsed = actualHeatmapData
      .map((entry) => {
        const match = /(\d+)\D+(\d+)/.exec(entry.score);

        if (!match) {
          return null;
        }

        return {
          goals: Number(match[1]) + Number(match[2]),
          occurrences: entry.occurrences ?? 0,
        };
      })
      .filter(
        (entry): entry is { goals: number; occurrences: number } =>
          entry !== null,
      );

    if (parsed.length === 0) {
      return null;
    }

    const totalMatches = parsed.reduce((sum, p) => sum + p.occurrences, 0);
    const totalGoals = parsed.reduce(
      (sum, p) => sum + p.goals * p.occurrences,
      0,
    );

    if (totalMatches === 0) {
      return null;
    }

    const avg = totalGoals / totalMatches;
    const bucketLow = Math.floor(avg / 0.5) * 0.5;

    const ranges = [-1, -0.5, 0, 0.5].map((offset) => {
      const low = Math.max(bucketLow + offset, 0);
      const high = low + 0.5;

      return {
        id: `range-${low.toFixed(1)}`,
        label: `${low.toFixed(1)}–${high.toFixed(1)} goals`,
        low,
        high,
      };
    });

    const correctRange =
      ranges.find((r) => avg >= r.low && avg < r.high) ?? ranges[2];

    return {
      avg,
      ranges,
      correctId: correctRange.id,
    };
  }, [actualHeatmapData]);

  const guessesPresent = [
    attendanceGuess,
    avgGoalsGuess,
    topScorerGuess,
    topTeamGuess,
  ].filter(Boolean).length;

  const attendanceGuessIndex = attendanceGuess ? 1 : 0;
  const avgGoalsGuessIndex =
    attendanceGuessIndex + (avgGoalsGuess ? 1 : 0);
  const topScorerGuessIndex =
    avgGoalsGuessIndex + (topScorerGuess ? 1 : 0);
  const topTeamGuessIndex = topScorerGuessIndex + (topTeamGuess ? 1 : 0);

  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter(Boolean).length;

  // All hooks (useState, useEffect, useMemo) have now run unconditionally
  // above, on every render — so it's safe to bail out into loading/error
  // UI here without breaking hook order.
  if (loading) {
    return (
      <div className="rounded-xl border border-[#12577A] bg-[#0F1A23] p-6 text-slate-300">
        Loading World Cup analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-6 text-red-200">
        {error}
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-white">
          World Cup Analytics
        </h1>

        <p className="mt-3 max-w-3xl text-slate-300">
          An analytical overview of World Cup performance, player
          statistics, stadium attendance, and prediction behaviour.
        </p>
      </div>

      {guessesPresent > 0 && (
        <div className="mb-12 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#12577A]/60 bg-[#0F1A23]/60 px-5 py-4">
          <p className="text-sm text-slate-300">
            Before every chart below, take a guess. The data decides who's
            right.
          </p>

          {answeredCount > 0 && (
            <p className="text-sm font-medium text-[#08AAA5]">
              {correctCount} / {answeredCount} correct so far
            </p>
          )}
        </div>
      )}

      <section className="mb-16 space-y-10">
        <SectionHeading
          title="Global World Cup Analytics"
          description="Statistical patterns from teams, players, stadiums, referees, and match performance."
        />

        {attendanceGuess && (
          <GuessMoment
            index={attendanceGuessIndex}
            total={guessesPresent}
            question="Which stadium drew the biggest crowd of the tournament?"
            helper="Based on total recorded attendance."
            options={attendanceGuess.options}
            correctId={attendanceGuess.correctId}
            resultTitle={attendanceGuess.correctItem.name}
            resultValue={attendanceGuess.correctItem.attendance ?? 0}
            resultValueLabel="fans in the stands"
            insight="Attendance swings with stadium capacity, kickoff time, and how far a match sits into the knockout rounds."
            onAnswered={(correct) => recordAnswer("attendance", correct)}
          >
            {attendeesData.length === 0 ? (
              <EmptyChartMessage message="No valid stadium attendance data was found." />
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={attendeesData}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 30, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#12577A" />
                    <XAxis type="number" stroke="#CBD5E1" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      stroke="#CBD5E1"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="attendance" fill="#08AAA5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </GuessMoment>
        )}

        {avgGoalsGuess && (
          <GuessMoment
            index={avgGoalsGuessIndex}
            total={guessesPresent}
            question="How many goals do you think were scored per match, on average?"
            helper="Worked out from every recorded scoreline and how often it occurred."
            options={avgGoalsGuess.ranges.map((range) => ({
              id: range.id,
              label: range.label,
            }))}
            correctId={avgGoalsGuess.correctId}
            resultTitle="Actual tournament average"
            resultValue={avgGoalsGuess.avg}
            resultValueLabel="goals per match"
            resultDecimals={2}
            insight="A tournament's goal average moves with how open group-stage games are versus how cagey the knockouts get."
            onAnswered={(correct) => recordAnswer("avgGoals", correct)}
          >
            {(selectedId) => {
              const chosenRange = avgGoalsGuess.ranges.find(
                (r) => r.id === selectedId,
              );

              if (!chosenRange) {
                return null;
              }

              return (
                <AverageComparisonBar
                  guessRange={chosenRange}
                  actual={avgGoalsGuess.avg}
                />
              );
            }}
          </GuessMoment>
        )}

        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">
            A deeper look
          </h2>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard
              title="Players by club"
              description="The clubs with the highest number of represented players."
            >
              {clubCountsData.length === 0 ? (
                <EmptyChartMessage message="No valid club-count data was found." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={clubCountsData}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 30, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#12577A" />
                    <XAxis type="number" stroke="#CBD5E1" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      stroke="#CBD5E1"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1479A8" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard
              title="Club diversity by national team"
              description="National teams ranked by the number of unique clubs represented in their squads."
            >
              {clubDiversityData.length === 0 ? (
                <EmptyChartMessage message="No valid club-diversity data was found. Check that the file uses team and unique_clubs_represented." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={clubDiversityData}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 30, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#12577A" />
                    <XAxis type="number" stroke="#CBD5E1" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      stroke="#CBD5E1"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="diversity" fill="#12577A" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard
              title="Referee cards"
              description="Yellow and red cards recorded for referees."
            >
              {refereeCardsData.length === 0 ? (
                <EmptyChartMessage message="No valid referee card data was found. The exact referee_cards.json structure is needed to map its fields correctly." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={refereeCardsData}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 30, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#12577A" />
                    <XAxis type="number" stroke="#CBD5E1" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      stroke="#CBD5E1"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="yellow"
                      stackId="cards"
                      fill="#08AAA5"
                      name="Yellow cards"
                    />
                    <Bar
                      dataKey="red"
                      stackId="cards"
                      fill="#DC2626"
                      name="Red cards"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard
              title="Player playing time"
              description="Players with the highest recorded playing time."
            >
              {topMinutesData.length === 0 ? (
                <EmptyChartMessage message="No valid playing-time data was found." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topMinutesData}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 30, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#12577A" />
                    <XAxis type="number" stroke="#CBD5E1" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      stroke="#CBD5E1"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="minutes" fill="#1479A8" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>

        {topScorerGuess && (
          <GuessMoment
            index={topScorerGuessIndex}
            total={guessesPresent}
            question="Who found the net more than anyone else in the tournament?"
            options={topScorerGuess.options}
            correctId={topScorerGuess.correctId}
            resultTitle={topScorerGuess.correctItem.name}
            resultValue={topScorerGuess.correctItem.goals ?? 0}
            resultValueLabel="goals"
            insight="The Golden Boot race usually comes down to a handful of players who both start every match and take the penalties."
            onAnswered={(correct) => recordAnswer("topScorer", correct)}
          >
            {topScorerData.length === 0 ? (
              <EmptyChartMessage message="No valid goal-scoring data was found." />
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topScorerData}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 30, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#12577A" />
                    <XAxis type="number" stroke="#CBD5E1" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      stroke="#CBD5E1"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="goals" fill="#08AAA5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </GuessMoment>
        )}

        {topTeamGuess && (
          <GuessMoment
            index={topTeamGuessIndex}
            total={guessesPresent}
            question="Which team scored the most goals across the whole tournament?"
            options={topTeamGuess.options}
            correctId={topTeamGuess.correctId}
            resultTitle={topTeamGuess.correctItem.name}
            resultValue={topTeamGuess.correctItem.goals ?? 0}
            resultValueLabel="total goals"
            insight="Total goals and goals per 90 minutes don't always agree — a team that plays more matches has more chances to add to its tally."
            onAnswered={(correct) => recordAnswer("topTeam", correct)}
          >
            {topScoringTeamsData.length === 0 ? (
              <EmptyChartMessage message="No valid team-scoring data was found." />
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#12577A" />
                    <XAxis
                      type="number"
                      dataKey="goalsPer90"
                      name="Goals per 90"
                      stroke="#CBD5E1"
                    />
                    <YAxis
                      type="number"
                      dataKey="goals"
                      name="Total goals"
                      stroke="#CBD5E1"
                    />
                    <Tooltip />
                    <Scatter data={topScoringTeamsData} fill="#08AAA5" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </GuessMoment>
        )}
      </section>

      <section>
        <SectionHeading
          title="Prediction Analytics"
          description="Prediction accuracy, scoreline expectations, confidence levels, and tournament winner preferences."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard
            title="Prediction accuracy by match type"
            description="Prediction accuracy across the different match types."
          >
            {accuracyByStageData.length === 0 ? (
              <EmptyChartMessage message="No valid accuracy data was found." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accuracyByStageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#12577A" />
                  <XAxis dataKey="stage" stroke="#CBD5E1" />
                  <YAxis stroke="#CBD5E1" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#08AAA5"
                    strokeWidth={3}
                    name="Accuracy"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Actual scoreline distribution"
            description="The frequency of actual scorelines recorded in the matches."
          >
            {actualHeatmapData.length === 0 ? (
              <EmptyChartMessage message="No valid actual scoreline data was found. Expected score and timesOccurred fields." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={actualHeatmapData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#12577A" />
                  <XAxis
                    dataKey="score"
                    stroke="#CBD5E1"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis stroke="#CBD5E1" />
                  <Tooltip />
                  <Bar
                    dataKey="occurrences"
                    fill="#08AAA5"
                    name="Actual occurrences"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Predicted scoreline distribution"
            description="The frequency of scorelines predicted by users."
          >
            {predictionHeatmapData.length === 0 ? (
              <EmptyChartMessage message="No valid predicted scoreline data was found. Expected score and timesPredicted fields." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={predictionHeatmapData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#12577A" />
                  <XAxis
                    dataKey="score"
                    stroke="#CBD5E1"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis stroke="#CBD5E1" />
                  <Tooltip />
                  <Bar
                    dataKey="predictions"
                    fill="#1479A8"
                    name="Predictions"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Confidence vs accuracy"
            description="Each point represents a match, comparing prediction confidence with actual accuracy."
          >
            {confidenceData.length === 0 ? (
              <EmptyChartMessage message="No valid confidence-versus-accuracy data was found." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#12577A" />
                  <XAxis
                    type="number"
                    dataKey="confidence"
                    name="Confidence"
                    stroke="#CBD5E1"
                  />
                  <YAxis
                    type="number"
                    dataKey="accuracy"
                    name="Accuracy"
                    stroke="#CBD5E1"
                  />
                  <Tooltip />
                  <Scatter data={confidenceData} fill="#08AAA5" />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Predicted goals vs actual goals"
            description="Each point is a team: how many goals per match fans expected, versus how many they actually scored. Points near the diagonal were well-predicted."
          >
            {predictedVsActualGoalsData.length === 0 ? (
              <EmptyChartMessage message="No valid predicted-vs-actual goals data was found." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#12577A" />
                  <XAxis
                    type="number"
                    dataKey="predicted"
                    name="Predicted goals"
                    stroke="#CBD5E1"
                  />
                  <YAxis
                    type="number"
                    dataKey="actual"
                    name="Actual goals"
                    stroke="#CBD5E1"
                  />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={predictedVsActualGoalsData} fill="#08AAA5" />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Tournament winner predictions"
            description="Teams selected most frequently as predicted tournament winners."
          >
            {winnerData.length === 0 ? (
              <EmptyChartMessage message="No valid tournament-winner prediction data was found." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={winnerData}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 30, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#12577A" />
                  <XAxis type="number" stroke="#CBD5E1" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    stroke="#CBD5E1"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="predictions"
                    fill="#08AAA5"
                    name="Predictions"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Predicted scorelines vs actual occurrences"
            description="How often each scoreline was predicted, next to how often it actually happened."
          >
            {scorePsychologyData.length === 0 ? (
              <EmptyChartMessage message="No valid combined scoreline data was found." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={scorePsychologyData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#12577A" />
                  <XAxis
                    dataKey="score"
                    stroke="#CBD5E1"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis stroke="#CBD5E1" />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="predicted"
                    fill="#1479A8"
                    name="Times predicted"
                  />
                  <Bar dataKey="actual" fill="#08AAA5" name="Times occurred" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </section>
    </main>
  );
}