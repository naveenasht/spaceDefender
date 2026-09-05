import Phaser from "phaser";
import { GAME_WIDTH } from "../config";

export interface BossOptions {
  name: string;
  hp: number;
  fireCooldownMs: number;
}

const ENTRY_TARGET_Y = 165;
const ENTRY_SPEED = 120;
const PATROL_SPEED = 90;
const PATROL_MARGIN = 90;

export class Boss extends Phaser.Physics.Arcade.Sprite {
  bossName: string;
  hp: number;
  maxHp: number;
  fireCooldownMs: number;
  lastFiredAt = 0;
  isPatrolling = false;
  isCharging = false;
  attackCount = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: BossOptions) {
    super(scene, x, y, "boss");
    this.bossName = opts.name;
    this.hp = opts.hp;
    this.maxHp = opts.hp;
    this.fireCooldownMs = opts.fireCooldownMs;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.8, this.height * 0.8);
    body.setVelocityY(ENTRY_SPEED);
  }

  /** Returns true if the boss died from this hit. */
  applyDamage(amount: number): boolean {
    this.hp -= amount;
    if (this.hp <= 0) return true;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(60, () => this.clearTint());
    return false;
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (!this.isPatrolling) {
      if (this.y >= ENTRY_TARGET_Y) {
        this.y = ENTRY_TARGET_Y;
        body.setVelocityY(0);
        body.setVelocityX(PATROL_SPEED);
        this.isPatrolling = true;
      }
      return;
    }

    if (this.x <= PATROL_MARGIN) {
      this.x = PATROL_MARGIN;
      body.setVelocityX(PATROL_SPEED);
    } else if (this.x >= GAME_WIDTH - PATROL_MARGIN) {
      this.x = GAME_WIDTH - PATROL_MARGIN;
      body.setVelocityX(-PATROL_SPEED);
    }
  }
}
