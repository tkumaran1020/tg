export interface ExamAttempt {
  date: string;
  score: number;
  total: number;
  passed: boolean;
  timeSpentSeconds: number;
}

export interface DrillSession {
  date: string;
  concept: string;
  correct: boolean;
}

export interface ConceptProgress {
  [concept: string]: {
    attempts: number;
    correct: number;
  };
}

export interface UserProgress {
  examAttempts: ExamAttempt[];
  drillSessions: DrillSession[];
  conceptProgress: ConceptProgress;
}

const PROGRESS_KEY = "notary_progress";
const API_KEY_KEY = "notary_api_key";

export function getProgress(): UserProgress {
  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return { examAttempts: [], drillSessions: [], conceptProgress: {} };
}

export function saveProgress(progress: UserProgress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function recordExamAttempt(attempt: ExamAttempt): void {
  const progress = getProgress();
  progress.examAttempts = [attempt, ...progress.examAttempts].slice(0, 10);
  saveProgress(progress);
}

export function recordDrillResult(concept: string, correct: boolean): void {
  const progress = getProgress();
  const session: DrillSession = {
    date: new Date().toISOString(),
    concept,
    correct,
  };
  progress.drillSessions = [session, ...progress.drillSessions].slice(0, 200);

  if (!progress.conceptProgress[concept]) {
    progress.conceptProgress[concept] = { attempts: 0, correct: 0 };
  }
  progress.conceptProgress[concept].attempts++;
  if (correct) progress.conceptProgress[concept].correct++;

  saveProgress(progress);
}

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_KEY) || "";
}

export function saveApiKey(key: string): void {
  localStorage.setItem(API_KEY_KEY, key);
}

export function clearProgress(): void {
  localStorage.removeItem(PROGRESS_KEY);
}
