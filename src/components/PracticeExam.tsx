import { useState, useEffect, useRef, useCallback } from "react";
import {
  QUESTIONS,
  EXAM_QUESTION_COUNT,
  PASSING_SCORE_PERCENT,
  type Question,
} from "../data/questions";
import { explainWrongAnswer } from "../lib/claude";
import { recordExamAttempt } from "../lib/storage";

interface Props {
  onProgress: () => void;
}

type Stage = "intro" | "exam" | "results";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const EXAM_DURATION_SECS = 60 * 60; // 1 hour

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PracticeExam({ onProgress }: Props) {
  const [stage, setStage] = useState<Stage>("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SECS);
  const [startTime, setStartTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Review state
  const [reviewIdx, setReviewIdx] = useState(0);
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const submitExam = useCallback(
    (qs: Question[], ans: Record<number, number>, elapsed: number) => {
      if (timerRef.current) clearInterval(timerRef.current);
      const score = qs.filter((q, i) => ans[i] === q.correctIndex).length;
      const passed =
        (score / qs.length) * 100 >= PASSING_SCORE_PERCENT;
      recordExamAttempt({
        date: new Date().toISOString(),
        score,
        total: qs.length,
        passed,
        timeSpentSeconds: elapsed,
      });
      onProgress();
      setStage("results");
    },
    [onProgress]
  );

  useEffect(() => {
    if (stage !== "exam") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          submitExam(questions, answers, elapsed);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage, questions, answers, startTime, submitExam]);

  function startExam() {
    const qs = shuffle(QUESTIONS).slice(0, EXAM_QUESTION_COUNT);
    setQuestions(qs);
    setAnswers({});
    setCurrentIdx(0);
    setTimeLeft(EXAM_DURATION_SECS);
    setStartTime(Date.now());
    setStage("exam");
    setReviewIdx(0);
    setExplanations({});
  }

  function selectAnswer(idx: number) {
    setAnswers((prev) => ({ ...prev, [currentIdx]: idx }));
  }

  function handleSubmit() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    submitExam(questions, answers, elapsed);
  }

  async function loadExplanation(qIdx: number) {
    const q = questions[qIdx];
    const chosen = answers[qIdx];
    if (
      chosen === q.correctIndex ||
      explanations[qIdx] !== undefined ||
      loadingExplanation
    )
      return;
    setLoadingExplanation(true);
    try {
      const text = await explainWrongAnswer(
        q.question,
        q.choices,
        q.correctIndex,
        chosen
      );
      setExplanations((prev) => ({ ...prev, [qIdx]: text }));
    } finally {
      setLoadingExplanation(false);
    }
  }

  // ─── Intro ───────────────────────────────────────────────────────────────
  if (stage === "intro") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-blue-900">Practice Exam</h2>
          <p className="text-slate-500 mt-1">
            Simulated NY Notary Public licensing exam
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: "Questions", value: EXAM_QUESTION_COUNT },
              { label: "Time Limit", value: "60 min" },
              { label: "Passing Score", value: `${PASSING_SCORE_PERCENT}%` },
              { label: "Format", value: "Multiple choice" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-900">{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <strong>Exam Rules:</strong>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li>You may skip questions and return to them</li>
              <li>The exam auto-submits when time runs out</li>
              <li>
                All {EXAM_QUESTION_COUNT} questions are drawn from our question bank
              </li>
              <li>
                After submission, Claude can explain any wrong answer
              </li>
            </ul>
          </div>

          <button
            onClick={startExam}
            className="w-full bg-blue-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition-colors"
          >
            Start Exam
          </button>
        </div>
      </div>
    );
  }

  // ─── Exam ─────────────────────────────────────────────────────────────────
  if (stage === "exam") {
    const q = questions[currentIdx];
    const answered = Object.keys(answers).length;
    const isLowTime = timeLeft < 300;

    return (
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 bg-white rounded-xl border border-slate-200 px-5 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              Question{" "}
              <span className="font-bold text-blue-900">
                {currentIdx + 1}/{questions.length}
              </span>
            </span>
            <span className="text-sm text-slate-400">
              Answered: {answered}/{questions.length}
            </span>
          </div>
          <div
            className={`font-mono font-bold text-lg px-3 py-1 rounded-lg ${
              isLowTime
                ? "bg-red-100 text-red-600"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-200 rounded-full">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {q.concept}
            </span>
            <p className="mt-3 text-slate-800 font-medium text-lg leading-relaxed">
              {q.question}
            </p>
          </div>

          <div className="space-y-3">
            {q.choices.map((choice, idx) => {
              const selected = answers[currentIdx] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => selectAnswer(idx)}
                  className={`w-full text-left border-2 rounded-lg px-4 py-3 transition-all text-slate-700 ${
                    selected
                      ? "border-blue-500 bg-blue-50 font-medium"
                      : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  <span className="font-semibold mr-2 text-slate-400">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  {choice}
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors"
            >
              ← Previous
            </button>

            <div className="flex gap-2">
              {currentIdx < questions.length - 1 ? (
                <button
                  onClick={() =>
                    setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))
                  }
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors font-medium"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-bold"
                >
                  Submit Exam
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question navigator */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 mb-3">
            Question Navigator — click to jump
          </p>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={`w-8 h-8 rounded text-xs font-semibold transition-colors ${
                  i === currentIdx
                    ? "bg-blue-900 text-white"
                    : answers[i] !== undefined
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {answered < questions.length && (
            <p className="text-xs text-slate-400 mt-2">
              {questions.length - answered} unanswered
            </p>
          )}
        </div>

        {/* Submit early */}
        {answered === questions.length && (
          <button
            onClick={handleSubmit}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
          >
            Submit Exam ({answered}/{questions.length} answered)
          </button>
        )}
      </div>
    );
  }

  // ─── Results ──────────────────────────────────────────────────────────────
  const score = questions.filter((q, i) => answers[i] === q.correctIndex).length;
  const pct = Math.round((score / questions.length) * 100);
  const passed = pct >= PASSING_SCORE_PERCENT;
  const reviewQ = questions[reviewIdx];
  const reviewAnswer = answers[reviewIdx];
  const reviewCorrect = reviewAnswer === reviewQ?.correctIndex;

  return (
    <div className="space-y-6">
      {/* Score card */}
      <div
        className={`rounded-2xl p-8 text-center shadow-sm ${
          passed
            ? "bg-emerald-50 border-2 border-emerald-400"
            : "bg-red-50 border-2 border-red-300"
        }`}
      >
        <div className="text-6xl mb-3">{passed ? "🎉" : "📚"}</div>
        <h2
          className={`text-3xl font-bold mb-1 ${
            passed ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {passed ? "You Passed!" : "Keep Studying"}
        </h2>
        <p className="text-5xl font-bold my-3 text-slate-800">{pct}%</p>
        <p className="text-slate-600">
          {score} out of {questions.length} correct
        </p>
        <p
          className={`mt-2 font-semibold text-lg ${
            passed ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {passed
            ? `Passed — needed ${PASSING_SCORE_PERCENT}%`
            : `Failed — needed ${PASSING_SCORE_PERCENT}%, got ${pct}%`}
        </p>
        <button
          onClick={startExam}
          className="mt-5 bg-blue-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-800 transition-colors"
        >
          Retake Exam
        </button>
      </div>

      {/* Breakdown by concept */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-semibold text-blue-900 mb-4">Results by Concept</h3>
        {(() => {
          const byConcept: Record<
            string,
            { correct: number; total: number }
          > = {};
          questions.forEach((q, i) => {
            if (!byConcept[q.concept])
              byConcept[q.concept] = { correct: 0, total: 0 };
            byConcept[q.concept].total++;
            if (answers[i] === q.correctIndex)
              byConcept[q.concept].correct++;
          });
          return Object.entries(byConcept).map(([concept, data]) => {
            const cp = Math.round((data.correct / data.total) * 100);
            return (
              <div
                key={concept}
                className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700 truncate">{concept}</span>
                    <span className="font-medium text-slate-600 ml-2 shrink-0">
                      {data.correct}/{data.total}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full mt-1">
                    <div
                      className={`h-full rounded-full ${
                        cp >= 80
                          ? "bg-emerald-500"
                          : cp >= 60
                          ? "bg-yellow-400"
                          : "bg-red-400"
                      }`}
                      style={{ width: `${cp}%` }}
                    />
                  </div>
                </div>
                <span
                  className={`text-sm font-bold shrink-0 ${
                    cp >= 80
                      ? "text-emerald-600"
                      : cp >= 60
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {cp}%
                </span>
              </div>
            );
          });
        })()}
      </div>

      {/* Review questions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h3 className="font-semibold text-blue-900">Review Answers</h3>

        {/* Navigator */}
        <div className="flex flex-wrap gap-1.5">
          {questions.map((q, i) => {
            const correct = answers[i] === q.correctIndex;
            return (
              <button
                key={i}
                onClick={() => {
                  setReviewIdx(i);
                  if (!correct && answers[i] !== undefined) {
                    loadExplanation(i);
                  }
                }}
                className={`w-8 h-8 rounded text-xs font-semibold transition-colors ${
                  i === reviewIdx
                    ? "ring-2 ring-blue-500 ring-offset-1"
                    : ""
                } ${
                  answers[i] === undefined
                    ? "bg-slate-200 text-slate-400"
                    : correct
                    ? "bg-emerald-500 text-white"
                    : "bg-red-400 text-white"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-400">
          Green = correct, Red = incorrect, Gray = skipped
        </p>

        {/* Review card */}
        {reviewQ && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
            <div>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {reviewQ.concept}
              </span>
              <p className="mt-2 font-medium text-slate-800 leading-relaxed">
                {reviewQ.question}
              </p>
            </div>

            <div className="space-y-2">
              {reviewQ.choices.map((choice, idx) => {
                let style = "border-slate-200 bg-white text-slate-600";
                if (idx === reviewQ.correctIndex)
                  style = "border-emerald-500 bg-emerald-50 text-emerald-800 font-medium";
                else if (idx === reviewAnswer && !reviewCorrect)
                  style = "border-red-400 bg-red-50 text-red-700";
                return (
                  <div
                    key={idx}
                    className={`border-2 rounded-lg px-4 py-2.5 text-sm ${style}`}
                  >
                    <span className="font-semibold mr-2 opacity-60">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {choice}
                    {idx === reviewQ.correctIndex && (
                      <span className="ml-2 text-emerald-600">✓ Correct</span>
                    )}
                    {idx === reviewAnswer && !reviewCorrect && (
                      <span className="ml-2 text-red-500">✗ Your answer</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Built-in explanation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>Explanation:</strong> {reviewQ.explanation}
            </div>

            {/* AI explanation for wrong answers */}
            {!reviewCorrect && reviewAnswer !== undefined && (
              <div>
                {explanations[reviewIdx] ? (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
                    <strong className="flex items-center gap-1 mb-1">
                      <span>🤖</span> AI Tutor Explanation:
                    </strong>
                    {explanations[reviewIdx]}
                  </div>
                ) : (
                  <button
                    onClick={() => loadExplanation(reviewIdx)}
                    disabled={loadingExplanation}
                    className="w-full border border-purple-300 text-purple-700 py-2 rounded-lg text-sm hover:bg-purple-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loadingExplanation ? (
                      <>
                        <Spinner className="text-purple-500" /> Getting AI explanation...
                      </>
                    ) : (
                      "Get AI explanation for this wrong answer"
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner({ className = "text-white" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
