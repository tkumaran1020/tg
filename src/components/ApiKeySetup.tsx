import { useState } from "react";
import { saveApiKey } from "../lib/storage";
import { initClient } from "../lib/claude";

interface Props {
  onReady: () => void;
}

export default function ApiKeySetup({ onReady }: Props) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed.startsWith("sk-ant-")) {
      setError("API key should start with 'sk-ant-'");
      return;
    }
    setLoading(true);
    setError("");
    try {
      initClient(trimmed);
      saveApiKey(trimmed);
      onReady();
    } catch {
      setError("Failed to initialize client");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚖️</div>
          <h1 className="text-2xl font-bold text-blue-900">
            NY Notary Exam Trainer
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            Prepare for the New York State Notary Public licensing exam with
            AI-powered drills, practice exams, and a tutoring chatbot.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { icon: "📊", label: "Progress Dashboard" },
            { icon: "🧠", label: "AI-Generated Drills" },
            { icon: "📝", label: "Practice Exam" },
            { icon: "💬", label: "AI Tutor Chat" },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 bg-slate-50 rounded-xl p-3 text-sm text-slate-700"
            >
              <span className="text-xl">{icon}</span>
              <span className="font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* API Key Form */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
          <strong>Setup required:</strong> This app uses the Anthropic Claude
          API for AI features. Enter your API key below — it's stored only in
          your browser's local storage.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Anthropic API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-ant-..."
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Get your API key at{" "}
              <span className="font-medium text-slate-500">
                console.anthropic.com
              </span>
            </p>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Starting..." : "Start Training"}
          </button>
        </form>
      </div>
    </div>
  );
}
