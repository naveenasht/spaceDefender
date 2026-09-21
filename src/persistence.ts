const STORAGE_KEY = "spaceDefender.bestScores.v1";

interface BestScores {
  overall: number;
  byLevel: Record<string, number>;
}

function load(): BestScores {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { overall: 0, byLevel: {} };
    const parsed = JSON.parse(raw) as Partial<BestScores>;
    return {
      overall: typeof parsed.overall === "number" ? parsed.overall : 0,
      byLevel: parsed.byLevel ?? {},
    };
  } catch {
    return { overall: 0, byLevel: {} };
  }
}

function save(data: BestScores): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Private browsing, disabled storage, or quota exceeded — best scores
    // just won't persist this session. Nothing else depends on this succeeding.
  }
}

export function getBestOverall(): number {
  return load().overall;
}

export function getBestForLevel(levelId: string): number {
  return load().byLevel[levelId] ?? 0;
}

export interface ScoreResult {
  isNewOverallBest: boolean;
  isNewLevelBest: boolean;
}

/** Records a completed run's score, persisting only if it beat a prior best. */
export function recordScore(levelId: string, score: number): ScoreResult {
  const data = load();
  const isNewOverallBest = score > data.overall;
  const isNewLevelBest = score > (data.byLevel[levelId] ?? 0);

  if (isNewOverallBest) data.overall = score;
  if (isNewLevelBest) data.byLevel[levelId] = score;
  if (isNewOverallBest || isNewLevelBest) save(data);

  return { isNewOverallBest, isNewLevelBest };
}
