export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const PLAYER_SPEED = 320;
export const PLAYER_START_LIVES = 3;
export const PLAYER_START_AMMO = 100;
export const PLAYER_INVULN_MS = 1500;

export const LASER_SPEED = 650;
export const LASER_AMMO_COST = 1;
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
} as const;
