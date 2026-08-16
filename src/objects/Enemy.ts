import Phaser from "phaser";
import { SCORE } from "../config";

export type EnemyKind = "enemy" | "shooter" | "extra";

const TEXTURE_BY_KIND: Record<EnemyKind, string> = {
  enemy: "enemy",
  shooter: "enemyShooter",
  extra: "enemyExtra",
};

const HP_BY_KIND: Record<EnemyKind, number> = {
  enemy: 1,
  shooter: 2,
  extra: 3,
};

const SPEED_BY_KIND: Record<EnemyKind, number> = {
  enemy: 90,
  shooter: 70,
  extra: 110,
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  kind: EnemyKind;
  hp: number;
  scoreValue: number;
  driftPhase = Math.random() * Math.PI * 2;
  baseX: number;
  lastFiredAt = 0;
  fireCooldownMs: number;
  private speed: number;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: EnemyKind) {
    super(scene, x, y, TEXTURE_BY_KIND[kind]);
    this.kind = kind;
    this.hp = HP_BY_KIND[kind];
    this.baseX = x;
    this.fireCooldownMs = Phaser.Math.Between(1400, 2400);
    this.speed = SPEED_BY_KIND[kind];

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.scoreValue =
      kind === "extra" ? SCORE.extra : kind === "shooter" ? SCORE.shooter : SCORE.enemy;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.75, this.height * 0.75);
  }

  /**
   * Arcade Group#add() resets a member's velocity to the group defaults,
   * so velocity must be (re)applied after the enemy is added to its group.
   */
  launch(): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocityY(this.speed);
  }

  /** Returns true if the enemy died from this hit. */
  applyDamage(amount: number): boolean {
    this.hp -= amount;
    if (this.hp <= 0) {
      return true;
    }
    this.setTint(0xffffff);
    this.scene.time.delayedCall(60, () => this.clearTint());
    return false;
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.driftPhase += delta * 0.002;
    this.x = this.baseX + Math.sin(this.driftPhase) * (this.kind === "extra" ? 60 : 30);
  }
}
