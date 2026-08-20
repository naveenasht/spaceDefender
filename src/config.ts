export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const PLAYER_SPEED = 320;
export const PLAYER_START_LIVES = 3;
export const PLAYER_START_AMMO = 100;
export const PLAYER_INVULN_MS = 1500;

export const LASER_SPEED = 650;
export const PLAYER_FIRE_COOLDOWN_MS = 180;

export const ENEMY_LASER_SPEED = 380;

export const POWERUP_SLOTS = 4;
export const SHIELD_DURATION_MS = 5000;
export const AMMO_PACK_AMOUNT = 50;
export const AMMO_BURST_AMOUNT = 30;

export type PowerupType = "bomb" | "shield" | "ammoBurst" | "rapidFire";

export const SCORE = {
  enemy: 10,
  shooter: 25,
  extra: 60,
  boss: 400,
} as const;

export const BOSS_LASER_SPEED = 340;

export interface CharacterDef {
  id: string;
  name: string;
  tagline: string;
  texture: string;
  color: number;
  edgeColor: number;
  speedMult: number;
  fireCooldownMult: number;
  livesDelta: number;
  ammoMult: number;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: "interceptor",
    name: "Interceptor",
    tagline: "Balanced all-rounder",
    texture: "player",
    color: 0x4dc9ff,
    edgeColor: 0xe6faff,
    speedMult: 1,
    fireCooldownMult: 1,
    livesDelta: 0,
    ammoMult: 1,
  },
  {
    id: "vanguard",
    name: "Vanguard",
    tagline: "Heavy hull, slower guns",
    texture: "playerVanguard",
    color: 0xff9a3d,
    edgeColor: 0xffe0b3,
    speedMult: 0.82,
    fireCooldownMult: 1.3,
    livesDelta: 1,
    ammoMult: 1.2,
  },
  {
    id: "striker",
    name: "Striker",
    tagline: "Fast & fragile, rapid trigger",
    texture: "playerStriker",
    color: 0xb84dff,
    edgeColor: 0xf0d9ff,
    speedMult: 1.22,
    fireCooldownMult: 0.7,
    livesDelta: -1,
    ammoMult: 0.8,
  },
];

export interface LaserDef {
  id: string;
  name: string;
  tagline: string;
  texture: string;
  color: number;
  edgeColor: number;
  ammoCost: number;
  damage: number;
  pierceCount: number;
  spreadCount: number;
  spreadAngleDeg: number;
  spreadOffsetPx: number;
  fireCooldownMult: number;
  homing: boolean;
}

export const LASERS: LaserDef[] = [
  {
    id: "pulse",
    name: "Pulse Laser",
    tagline: "Reliable single shot",
    texture: "playerLaser",
    color: 0x7cf7ff,
    edgeColor: 0xffffff,
    ammoCost: 1,
    damage: 1,
    pierceCount: 1,
    spreadCount: 1,
    spreadAngleDeg: 0,
    spreadOffsetPx: 0,
    fireCooldownMult: 1,
    homing: false,
  },
  {
    id: "spread",
    name: "Spread Laser",
    tagline: "3-way volley, great vs crowds",
    texture: "laserSpread",
    color: 0xffcf5c,
    edgeColor: 0xfff0c9,
    ammoCost: 2,
    damage: 1,
    pierceCount: 1,
    spreadCount: 3,
    spreadAngleDeg: 16,
    spreadOffsetPx: 0,
    fireCooldownMult: 1,
    homing: false,
  },
  {
    id: "piercing",
    name: "Piercing Laser",
    tagline: "Punches through 3 targets",
    texture: "laserPierce",
    color: 0xb84dff,
    edgeColor: 0xf0d9ff,
    ammoCost: 1,
    damage: 1,
    pierceCount: 3,
    spreadCount: 1,
    spreadAngleDeg: 0,
    spreadOffsetPx: 0,
    fireCooldownMult: 1.35,
    homing: false,
  },
  {
    id: "twin",
    name: "Twin Laser",
    tagline: "Parallel double-tap, focused DPS",
    texture: "laserTwin",
    color: 0x4da6ff,
    edgeColor: 0xd6ecff,
    ammoCost: 2,
    damage: 1,
    pierceCount: 1,
    spreadCount: 2,
    spreadAngleDeg: 0,
    spreadOffsetPx: 12,
    fireCooldownMult: 1,
    homing: false,
  },
  {
    id: "homing",
    name: "Homing Laser",
    tagline: "Auto-seeks the nearest target",
    texture: "laserHoming",
    color: 0x4dffa0,
    edgeColor: 0xd6ffe9,
    ammoCost: 2,
    damage: 1,
    pierceCount: 1,
    spreadCount: 1,
    spreadAngleDeg: 0,
    spreadOffsetPx: 0,
    fireCooldownMult: 1.15,
    homing: true,
  },
  {
    id: "cannon",
    name: "Heavy Cannon",
    tagline: "Slow but hits twice as hard",
    texture: "laserCannon",
    color: 0xff5d5d,
    edgeColor: 0xffd6d6,
    ammoCost: 3,
    damage: 2,
    pierceCount: 1,
    spreadCount: 1,
    spreadAngleDeg: 0,
    spreadOffsetPx: 0,
    fireCooldownMult: 1.6,
    homing: false,
  },
];

export interface EnemyWeights {
  enemy: number;
  shooter: number;
  extra: number;
}

export interface LevelDef {
  id: string;
  name: string;
  tagline: string;
  difficulty: 1 | 2 | 3;
  enemySpawnMs: number;
  pickupSpawnMs: number;
  weights: EnemyWeights;
  bossName: string;
  bossScoreThreshold: number;
  bossHp: number;
  bossFireCooldownMs: number;
}

export const LEVELS: LevelDef[] = [
  {
    id: "alpha",
    name: "Sector Alpha",
    tagline: "Training grounds",
    difficulty: 1,
    enemySpawnMs: 1100,
    pickupSpawnMs: 3800,
    weights: { enemy: 0.75, shooter: 0.2, extra: 0.05 },
    bossName: "Outpost Warden",
    bossScoreThreshold: 300,
    bossHp: 50,
    bossFireCooldownMs: 2000,
  },
  {
    id: "beta",
    name: "Sector Beta",
    tagline: "Hostile territory",
    difficulty: 2,
    enemySpawnMs: 850,
    pickupSpawnMs: 4200,
    weights: { enemy: 0.6, shooter: 0.3, extra: 0.1 },
    bossName: "Void Marauder",
    bossScoreThreshold: 260,
    bossHp: 70,
    bossFireCooldownMs: 1650,
  },
  {
    id: "gamma",
    name: "Sector Gamma",
    tagline: "Into the swarm",
    difficulty: 3,
    enemySpawnMs: 650,
    pickupSpawnMs: 4600,
    weights: { enemy: 0.45, shooter: 0.35, extra: 0.2 },
    bossName: "Swarm Sovereign",
    bossScoreThreshold: 220,
    bossHp: 95,
    bossFireCooldownMs: 1300,
  },
];
