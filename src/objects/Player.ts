import Phaser from "phaser";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_FIRE_COOLDOWN_MS,
  PLAYER_INVULN_MS,
  PLAYER_SPEED,
  PLAYER_START_AMMO,
  PLAYER_START_LIVES,
  POWERUP_SLOTS,
  SHIELD_DURATION_MS,
  type PowerupType,
} from "../config";

export class Player extends Phaser.Physics.Arcade.Sprite {
  ammo = PLAYER_START_AMMO;
  lives = PLAYER_START_LIVES;
  powerups: PowerupType[] = [];
  rapidFireUntil = 0;

  private lastFiredAt = 0;
  private invulnUntil = 0;
  private shieldUntil = 0;
  private shieldFx: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDamping(true);
    this.setDrag(0.85);
    this.setMaxVelocity(PLAYER_SPEED);
    (this.body as Phaser.Physics.Arcade.Body).setSize(this.width * 0.7, this.height * 0.7);

    this.shieldFx = scene.add.image(x, y, "shieldFx").setVisible(false).setDepth(5);
  }

  get isShielded(): boolean {
    return this.scene.time.now < this.shieldUntil;
  }

  get isInvulnerable(): boolean {
    return this.scene.time.now < this.invulnUntil || this.isShielded;
  }

  get isRapidFire(): boolean {
    return this.scene.time.now < this.rapidFireUntil;
  }

  handleMovement(pressed: { up: boolean; down: boolean; left: boolean; right: boolean }): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;
    if (pressed.left) vx -= 1;
    if (pressed.right) vx += 1;
    if (pressed.up) vy -= 1;
    if (pressed.down) vy += 1;

    const len = Math.hypot(vx, vy) || 1;
    body.setVelocity((vx / len) * PLAYER_SPEED, (vy / len) * PLAYER_SPEED);
  }

  aimAt(pointerX: number, pointerY: number): void {
    this.rotation = Phaser.Math.Angle.Between(this.x, this.y, pointerX, pointerY);
  }

  tryFire(time: number): { angle: number } | null {
    const cooldown = this.isRapidFire ? PLAYER_FIRE_COOLDOWN_MS * 0.35 : PLAYER_FIRE_COOLDOWN_MS;
    if (time < this.lastFiredAt + cooldown) return null;
    if (this.ammo <= 0) return null;
    this.lastFiredAt = time;
    this.ammo -= 1;
    return { angle: this.rotation };
  }

  addAmmo(amount: number): void {
    this.ammo += amount;
  }

  addPowerup(type: PowerupType): boolean {
    if (this.powerups.length >= POWERUP_SLOTS) return false;
    this.powerups.push(type);
    return true;
  }

  useNextPowerup(): PowerupType | null {
    return this.powerups.shift() ?? null;
  }

  activateShield(): void {
    this.shieldUntil = this.scene.time.now + SHIELD_DURATION_MS;
  }

  activateRapidFire(durationMs: number): void {
    this.rapidFireUntil = this.scene.time.now + durationMs;
  }

  /** Returns true if this hit actually costs a life (i.e. player wasn't protected). */
  takeHit(): boolean {
    if (this.isInvulnerable) return false;
    this.lives -= 1;
    this.invulnUntil = this.scene.time.now + PLAYER_INVULN_MS;
    this.scene.tweens.add({
      targets: this,
      alpha: 0.25,
      duration: 90,
      yoyo: true,
      repeat: 6,
      onComplete: () => this.setAlpha(1),
    });
    return true;
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.shieldFx.setPosition(this.x, this.y);
    this.shieldFx.setVisible(this.isShielded);
    if (this.isShielded) {
      this.shieldFx.rotation += 0.02;
    }
    this.x = Phaser.Math.Clamp(this.x, 20, GAME_WIDTH - 20);
    this.y = Phaser.Math.Clamp(this.y, 20, GAME_HEIGHT - 20);
  }

  destroy(fromScene?: boolean): void {
    this.shieldFx.destroy();
    super.destroy(fromScene);
  }
}
