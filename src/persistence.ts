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

/** A one-time welcome grant — only applies while nothing has been saved yet. */
const STARTING_COINS = 100;

export function getCoins(): number {
  try {
    const raw = localStorage.getItem(COINS_KEY);
    if (raw === null) return STARTING_COINS;
    return Math.max(0, parseInt(raw, 10) || 0);
  } catch {
    return STARTING_COINS;
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

/** A persisted set of unlocked ids, keyed by a coin-purchase item's own id. */
function createUnlockStore(storageKey: string) {
  function load(): Set<string> {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  }

  function save(ids: Set<string>): void {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...ids]));
    } catch {
      // unlock just won't persist this session
    }
  }

  return {
    isUnlocked(id: string, coinCost: number): boolean {
      return coinCost <= 0 || load().has(id);
    },
    unlock(id: string): void {
      const ids = load();
      ids.add(id);
      save(ids);
    },
  };
}

const laserUnlocks = createUnlockStore("spaceDefender.unlockedLasers.v1");
export const isLaserUnlocked = laserUnlocks.isUnlocked;
export const unlockLaser = laserUnlocks.unlock;

const characterUnlocks = createUnlockStore("spaceDefender.unlockedCharacters.v1");
export const isCharacterUnlocked = characterUnlocks.isUnlocked;
export const unlockCharacter = characterUnlocks.unlock;

const LAST_LOADOUT_KEY = "spaceDefender.lastLoadout.v1";

export interface Loadout {
  characterId: string;
  laserId: string;
}

/** The character/laser picked last time a run actually started, if any. */
export function getLastLoadout(): Loadout | null {
  try {
    const raw = localStorage.getItem(LAST_LOADOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Loadout>;
    if (typeof parsed.characterId !== "string" || typeof parsed.laserId !== "string") return null;
    return { characterId: parsed.characterId, laserId: parsed.laserId };
  } catch {
    return null;
  }
}

export function saveLastLoadout(characterId: string, laserId: string): void {
  try {
    localStorage.setItem(LAST_LOADOUT_KEY, JSON.stringify({ characterId, laserId }));
  } catch {
    // won't persist this session
  }
}
