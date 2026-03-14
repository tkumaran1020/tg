import { useState } from "react";
import { CONCEPTS } from "../data/questions";
import {
  generateDrillQuestion,
  type DrillQuestion,
} from "../lib/claude";
import { recordDrillResult } from "../lib/storage";

interface Props {
  onProgress: () => void;
}

type Stage = "select" | "question" | "result";

export default function DrillMode({ onProgress }: Props) {
  const [concept, setConcept] = useState(CONCEPTS[0]);
  const [stage, setStage] = useState<Stage>("select");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState<DrillQuestion | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);

  async function startDrill() {
    setLoading(true);
    setError("");
    setSelected(null);
    try {
      const q = await generateDrillQuestion(concept);
      setQuestion(q);
      setStage("question");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate question");
    } finally {
      setLoading(false);
    }
  }

  function submitAnswer(idx: number) {
    if (!question || selected !== null) return;
    setSelected(idx);
    const correct = idx === question.correctIndex;
    recordDrillResult(concept, correct);
    setSessionCount((n) => n + 1);
    if (correct) setSessionCorrect((n) => n + 1);
    onProgress();
    setStage("result");
  }

  async function nextQuestion() {
    await startDrill();
  }

  function changeConcept() {
    setStage("select");
    setQuestion(null);
    setSelected(null);
    setError("");
  }

  const isCorrect = selected !== null && question && selected === question.correctIndex;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-blue-900">AI Concept Drills</h2>
        <p className="text-slate-500 mt-1">
          Practice specific topics with AI-generated questions
        </p>
      </div>

      {/* Session score */}
      {sessionCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center justify-between">
          <span className="text-blue-800 font-medium">Session score</span>
          <span className="text-blue-900 font-bold text-lg">
            {sessionCorrect}/{sessionCount}{" "}
            <span className="text-sm font-normal text-blue-600">
              ({Math.round((sessionCorrect / sessionCount) * 100)}%)
            </span>
          </span>
        </div>
      )}

      {/* Concept selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Select a concept to drill
        </label>
        <select
          value={concept}
          onChange={(e) => {
            setConcept(e.target.value);
            setStage("select");
            setQuestion(null);
            setSelected(null);
            setError("");
          }}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CONCEPTS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {stage === "select" && (
          <button
            onClick={startDrill}
            disabled={loading}
            className="mt-4 w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner /> Generating question...
              </>
            ) : (
              "Generate Question"
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
          <button
            onClick={startDrill}
            className="ml-3 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Question card */}
      {question && stage !== "select" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-4">
            <p className="text-slate-800 font-medium leading-relaxed text-lg">
              {question.question}
            </p>
            <span className="shrink-0 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
              {concept}
            </span>
          </div>

          <div className="space-y-3">
            {question.choices.map((choice, idx) => {
              let style =
                "border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 cursor-pointer";
              if (selected !== null) {
                if (idx === question.correctIndex) {
                  style = "border-emerald-500 bg-emerald-50 cursor-default";
                } else if (idx === selected) {
                  style = "border-red-400 bg-red-50 cursor-default";
                } else {
                  style = "border-slate-200 bg-slate-50 opacity-50 cursor-default";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => submitAnswer(idx)}
                  disabled={selected !== null}
                  className={`w-full text-left border-2 rounded-lg px-4 py-3 transition-all text-slate-700 ${style}`}
                >
                  <span className="font-semibold mr-2 text-slate-500">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  {choice}
                </button>
              );
            })}
          </div>

          {/* Result feedback */}
          {selected !== null && (
            <div
              className={`rounded-xl p-4 ${
                isCorrect
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{isCorrect ? "✓" : "✗"}</span>
                <span
                  className={`font-semibold ${
                    isCorrect ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {isCorrect ? "Correct!" : "Incorrect"}
                </span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                {question.explanation}
              </p>
            </div>
          )}

          {/* Action buttons */}
          {stage === "result" && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={nextQuestion}
                disabled={loading}
                className="flex-1 bg-blue-900 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Spinner /> Loading...
                  </>
                ) : (
                  "Next Question"
                )}
              </button>
              <button
                onClick={changeConcept}
                className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-medium"
              >
                Change Topic
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      {stage === "select" && sessionCount === 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-700 mb-2">How Drills Work</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold">1.</span>
              Select a concept from the dropdown above
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold">2.</span>
              Claude generates a unique multiple-choice question on that topic
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold">3.</span>
              Answer the question and receive instant feedback with explanation
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold">4.</span>
              Your accuracy per concept is tracked on the Dashboard
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-white"
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
