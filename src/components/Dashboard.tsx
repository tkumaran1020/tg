import { useMemo } from "react";
import {
  getProgress,
  clearProgress,
  type UserProgress,
} from "../lib/storage";
import { CONCEPTS, PASSING_SCORE_PERCENT } from "../data/questions";

interface Props {
  refreshKey: number;
}

function ConceptBar({
  concept,
  attempts,
  correct,
}: {
  concept: string;
  attempts: number;
  correct: number;
}) {
  const pct = attempts > 0 ? Math.round((correct / attempts) * 100) : null;
  const color =
    pct === null
      ? "bg-slate-200"
      : pct >= 80
      ? "bg-emerald-500"
      : pct >= 60
      ? "bg-yellow-400"
      : "bg-red-400";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-700 truncate">{concept}</span>
          <span className="text-slate-500 ml-2 shrink-0">
            {pct !== null ? `${pct}%` : "Not started"}
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${color}`}
            style={{ width: pct !== null ? `${pct}%` : "0%" }}
          />
        </div>
        {attempts > 0 && (
          <p className="text-xs text-slate-400 mt-0.5">
            {correct}/{attempts} correct
          </p>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({ refreshKey }: Props) {
  const progress: UserProgress = useMemo(() => {
    void refreshKey;
    return getProgress();
  }, [refreshKey]);

  const bestExam = useMemo(() => {
    if (!progress.examAttempts.length) return null;
    return progress.examAttempts.reduce((best, cur) =>
      cur.score / cur.total > best.score / best.total ? cur : best
    );
  }, [progress]);

  const lastExam = progress.examAttempts[0] ?? null;

  const totalDrills = progress.drillSessions.length;
  const correctDrills = progress.drillSessions.filter((d) => d.correct).length;
  const drillAccuracy =
    totalDrills > 0 ? Math.round((correctDrills / totalDrills) * 100) : null;

  const weakConcepts = CONCEPTS.filter((c) => {
    const cp = progress.conceptProgress[c];
    if (!cp || cp.attempts < 2) return false;
    return cp.correct / cp.attempts < 0.6;
  });

  const handleClear = () => {
    if (confirm("Reset all progress? This cannot be undone.")) {
      clearProgress();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-blue-900">Progress Dashboard</h2>
        <p className="text-slate-500 mt-1">
          Track your preparation for the NY Notary Public exam
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Practice Exams</p>
          <p className="text-3xl font-bold text-blue-900 mt-1">
            {progress.examAttempts.length}
          </p>
          {lastExam && (
            <p className="text-sm text-slate-400 mt-1">
              Last:{" "}
              <span
                className={
                  lastExam.passed ? "text-emerald-600" : "text-red-500"
                }
              >
                {Math.round((lastExam.score / lastExam.total) * 100)}%
              </span>{" "}
              ({lastExam.passed ? "PASS" : "FAIL"})
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Drills Completed</p>
          <p className="text-3xl font-bold text-blue-900 mt-1">{totalDrills}</p>
          {drillAccuracy !== null && (
            <p className="text-sm text-slate-400 mt-1">
              Accuracy:{" "}
              <span
                className={
                  drillAccuracy >= 70 ? "text-emerald-600" : "text-yellow-600"
                }
              >
                {drillAccuracy}%
              </span>
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Best Exam Score</p>
          {bestExam ? (
            <>
              <p className="text-3xl font-bold text-blue-900 mt-1">
                {Math.round((bestExam.score / bestExam.total) * 100)}%
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {bestExam.score}/{bestExam.total} correct &bull; Need {PASSING_SCORE_PERCENT}% to pass
              </p>
            </>
          ) : (
            <p className="text-2xl font-bold text-slate-300 mt-1">—</p>
          )}
        </div>
      </div>

      {/* Exam history */}
      {progress.examAttempts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-blue-900 mb-3">Exam History</h3>
          <div className="space-y-2">
            {progress.examAttempts.slice(0, 5).map((attempt, i) => {
              const pct = Math.round((attempt.score / attempt.total) * 100);
              const mins = Math.floor(attempt.timeSpentSeconds / 60);
              const secs = attempt.timeSpentSeconds % 60;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-0"
                >
                  <span className="text-slate-500">
                    {new Date(attempt.date).toLocaleDateString()}
                  </span>
                  <span className="font-medium text-slate-700">
                    {attempt.score}/{attempt.total}
                  </span>
                  <span
                    className={`font-semibold ${
                      pct >= PASSING_SCORE_PERCENT
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}
                  >
                    {pct}%
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      attempt.passed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {attempt.passed ? "PASS" : "FAIL"}
                  </span>
                  <span className="text-slate-400">
                    {mins}m {secs.toString().padStart(2, "0")}s
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Concept mastery */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-semibold text-blue-900 mb-4">Concept Mastery</h3>
        <div className="space-y-4">
          {CONCEPTS.map((concept) => {
            const cp = progress.conceptProgress[concept];
            return (
              <ConceptBar
                key={concept}
                concept={concept}
                attempts={cp?.attempts ?? 0}
                correct={cp?.correct ?? 0}
              />
            );
          })}
        </div>
        <div className="flex gap-4 mt-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            ≥80% mastered
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
            60–79% developing
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            &lt;60% needs work
          </span>
        </div>
      </div>

      {/* Weak spots */}
      {weakConcepts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="font-semibold text-amber-800 mb-2">
            Focus Areas
          </h3>
          <p className="text-sm text-amber-700 mb-3">
            These concepts need more practice:
          </p>
          <ul className="space-y-1">
            {weakConcepts.map((c) => (
              <li key={c} className="text-sm text-amber-800 flex items-center gap-2">
                <span className="text-amber-500">•</span> {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reset */}
      {(progress.examAttempts.length > 0 || totalDrills > 0) && (
        <div className="text-right">
          <button
            onClick={handleClear}
            className="text-sm text-slate-400 hover:text-red-500 transition-colors"
          >
            Reset all progress
          </button>
        </div>
      )}

      {totalDrills === 0 && progress.examAttempts.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No activity yet</p>
          <p className="text-sm mt-1">
            Start with the Drills or Practice Exam to track your progress.
          </p>
        </div>
      )}
    </div>
  );
}
