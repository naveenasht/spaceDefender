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

const COINS_KEY = "spaceDefender.coins.v1";

export function getCoins(): number {
  try {
    return Math.max(0, parseInt(localStorage.getItem(COINS_KEY) ?? "0", 10) || 0);
  } catch {
    return 0;
  }
}

/** Adds coins to the persisted balance and returns the new total. */
export function addCoins(amount: number): number {
  const total = getCoins() + amount;
  try {
    localStorage.setItem(COINS_KEY, String(total));
  } catch {
    // Private browsing, disabled storage, or quota exceeded — coins just
    // won't persist this session.
  }
  return total;
}

/** Deducts coins if the balance covers it. Returns false (no-op) otherwise. */
export function spendCoins(amount: number): boolean {
  if (getCoins() < amount) return false;
  addCoins(-amount);
  return true;
}

const UNLOCKED_LASERS_KEY = "spaceDefender.unlockedLasers.v1";

function loadUnlockedLasers(): Set<string> {
  try {
    const raw = localStorage.getItem(UNLOCKED_LASERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveUnlockedLasers(ids: Set<string>): void {
  try {
    localStorage.setItem(UNLOCKED_LASERS_KEY, JSON.stringify([...ids]));
  } catch {
    // unlock just won't persist this session
  }
}

export function isLaserUnlocked(laserId: string, coinCost: number): boolean {
  return coinCost <= 0 || loadUnlockedLasers().has(laserId);
}

export function unlockLaser(laserId: string): void {
  const ids = loadUnlockedLasers();
  ids.add(laserId);
  saveUnlockedLasers(ids);
}
