import { useState, useEffect } from "react";
import { getApiKey } from "./lib/storage";
import { initClient } from "./lib/claude";
import ApiKeySetup from "./components/ApiKeySetup";
import Dashboard from "./components/Dashboard";
import DrillMode from "./components/DrillMode";
import PracticeExam from "./components/PracticeExam";
import Tutor from "./components/Tutor";

type Tab = "dashboard" | "drills" | "exam" | "tutor";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "drills", label: "Drills", icon: "🧠" },
  { id: "exam", label: "Practice Exam", icon: "📝" },
  { id: "tutor", label: "AI Tutor", icon: "💬" },
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [progressKey, setProgressKey] = useState(0);

  useEffect(() => {
    const key = getApiKey();
    if (key) {
      try {
        initClient(key);
        setReady(true);
      } catch {
        // Key saved but init failed — user will need to re-enter
      }
    }
  }, []);

  function handleReady() {
    setReady(true);
  }

  function refreshProgress() {
    setProgressKey((k) => k + 1);
  }

  if (!ready) {
    return <ApiKeySetup onReady={handleReady} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚖️</span>
            <div>
              <h1 className="font-bold text-lg leading-tight">
                NY Notary Exam Trainer
              </h1>
              <p className="text-blue-300 text-xs">
                New York State Notary Public License
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("notary_api_key");
              window.location.reload();
            }}
            className="text-blue-300 hover:text-white text-xs transition-colors"
          >
            Change API Key
          </button>
        </div>

        {/* Tab navigation */}
        <div className="max-w-4xl mx-auto px-4">
          <nav className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-slate-50 text-blue-900"
                    : "text-blue-200 hover:text-white hover:bg-blue-800"
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === "dashboard" && (
          <Dashboard refreshKey={progressKey} />
        )}
        {activeTab === "drills" && (
          <DrillMode onProgress={refreshProgress} />
        )}
        {activeTab === "exam" && (
          <PracticeExam onProgress={refreshProgress} />
        )}
        {activeTab === "tutor" && <Tutor />}
      </main>
    </div>
  );
}
