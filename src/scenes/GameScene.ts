import Phaser from "phaser";
import {
  AMMO_BURST_AMOUNT,
  AMMO_PACK_AMOUNT,
  BOSS_LASER_SPEED,
  CHARACTERS,
  ENEMY_LASER_SPEED,
  GAME_HEIGHT,
  GAME_WIDTH,
  LASER_SPEED,
  LASERS,
  LEVELS,
  POWERUP_SLOTS,
  SCORE,
  type CharacterDef,
  type LaserDef,
  type LevelDef,
  type PowerupType,
} from "../config";
import { Player } from "../objects/Player";
import { Enemy, type EnemyKind } from "../objects/Enemy";
import { Pickup, type PickupKind } from "../objects/Pickup";
import { Boss } from "../objects/Boss";

const BOSS_VOLLEY_COUNT = 5;
const BOSS_VOLLEY_SPREAD_DEG = 55;
const BOSS_BEAM_SPEED = 520;
const BOSS_BEAM_TELEGRAPH_MS = 450;
const BOSS_BEAM_EVERY_NTH_ATTACK = 3;
const HOMING_TURN_RATE = 4.5; // radians/sec

const RAPID_FIRE_DURATION_MS = 6000;

interface GameSceneData {
  characterId?: string;
  laserId?: string;
  levelId?: string;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private character!: CharacterDef;
  private laser!: LaserDef;
  private level!: LevelDef;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private keyF!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;

  private enemies!: Phaser.Physics.Arcade.Group;
  private playerLasers!: Phaser.Physics.Arcade.Group;
  private enemyLasers!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;

  private stars: { img: Phaser.GameObjects.Image; speed: number }[] = [];

  private score = 0;
  private elapsedMs = 0;
  private gameOver = false;

  private scoreText!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;
  private rapidFireText!: Phaser.GameObjects.Text;
  private healthBarFill!: Phaser.GameObjects.Rectangle;
  private healthBarFlash!: Phaser.GameObjects.Rectangle;
  private healthBarWidth = 150;
  private healthBarHeight = 16;
  private lastLives = 0;
  private slotBoxes: Phaser.GameObjects.Rectangle[] = [];
  private slotIcons: (Phaser.GameObjects.Image | null)[] = [];
  private slotTypes: (PowerupType | undefined)[] = [];

  private enemySpawnTimer!: Phaser.Time.TimerEvent;
  private pickupSpawnTimer!: Phaser.Time.TimerEvent;
  private boss: Boss | null = null;
  private bossActive = false;
  private bossThreshold = 0;
  private bossesDefeated = 0;
  private bossLaserOverlap?: Phaser.Physics.Arcade.Collider;
  private bossPlayerOverlap?: Phaser.Physics.Arcade.Collider;
  private bossNameText!: Phaser.GameObjects.Text;
  private bossBarBg!: Phaser.GameObjects.Rectangle;
  private bossBarFill!: Phaser.GameObjects.Rectangle;
  private bossBarWidth = 340;
  private bossBarHeight = 14;

  constructor() {
    super("Game");
  }

  create(data: GameSceneData): void {
    this.character = CHARACTERS.find((c) => c.id === data.characterId) ?? CHARACTERS[0];
    this.laser = LASERS.find((l) => l.id === data.laserId) ?? LASERS[0];
    this.level = LEVELS.find((l) => l.id === data.levelId) ?? LEVELS[0];

    this.score = 0;
    this.elapsedMs = 0;
    this.gameOver = false;
    this.boss = null;
    this.bossActive = false;
    this.bossesDefeated = 0;
    this.bossThreshold = this.level.bossScoreThreshold;
    this.bossLaserOverlap = undefined;
    this.bossPlayerOverlap = undefined;

    // Phaser reuses this Scene instance across scene.start("Game", ...) calls
    // (every retry), but these plain-array fields are only initialized once
    // at construction — reset them here or they silently accumulate stale,
    // already-destroyed references across sessions.
    this.stars = [];
    this.slotBoxes = [];
    this.slotIcons = [];
    this.slotTypes = [];

    this.createStarfield();

    this.enemies = this.physics.add.group({ classType: Enemy, runChildUpdate: true });
    this.playerLasers = this.physics.add.group();
    this.enemyLasers = this.physics.add.group();
    this.pickups = this.physics.add.group({ classType: Pickup, runChildUpdate: false });

    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 80, this.character, this.laser);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey("W"),
      A: this.input.keyboard!.addKey("A"),
      S: this.input.keyboard!.addKey("S"),
      D: this.input.keyboard!.addKey("D"),
    };
    this.keyF = this.input.keyboard!.addKey("F");
    this.keySpace = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.enemySpawnTimer = this.time.addEvent({
      delay: this.level.enemySpawnMs,
      loop: true,
      callback: () => this.spawnEnemy(),
    });
    this.pickupSpawnTimer = this.time.addEvent({
      delay: this.level.pickupSpawnMs,
      loop: true,
      callback: () => this.spawnPickup(),
    });

    this.setupCollisions();
    this.buildHud();
  }

  private createStarfield(): void {
    for (let i = 0; i < 90; i++) {
      const img = this.add
        .image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT), "star")
        .setAlpha(Phaser.Math.FloatBetween(0.3, 1))
        .setScale(Phaser.Math.FloatBetween(0.5, 1.6))
        .setDepth(-10);
      this.stars.push({ img, speed: Phaser.Math.FloatBetween(15, 60) });
    }
  }

  /**
   * Registers a laser-target hit against the laser's remaining pierce budget.
   * Returns false if this laser already hit that exact target (guards against
   * re-triggering on the same target across several overlapping frames), or
   * if the laser is already spent. Destroys the laser once pierce runs out.
   */
  private registerLaserHit(laser: Phaser.Physics.Arcade.Image, target: object): boolean {
    if (!laser.active) return false;
    const hitSet = laser.getData("hitSet") as Set<object>;
    if (hitSet.has(target)) return false;
    hitSet.add(target);

    const pierceLeft = (laser.getData("pierceLeft") as number) - 1;
    laser.setData("pierceLeft", pierceLeft);
    if (pierceLeft <= 0) laser.destroy();
    return true;
  }

  private setupCollisions(): void {
    this.physics.add.overlap(this.playerLasers, this.enemies, (laserObj, enemyObj) => {
      const laser = laserObj as Phaser.Physics.Arcade.Image;
      const enemy = enemyObj as Enemy;
      if (!this.registerLaserHit(laser, enemy)) return;
      const died = enemy.applyDamage(laser.getData("damage") as number);
      if (died) this.killEnemy(enemy);
    });

    this.physics.add.overlap(this.player, this.enemies, (_playerObj, enemyObj) => {
      const enemy = enemyObj as Enemy;
      const hit = this.player.takeHit();
      this.killEnemy(enemy, hit ? undefined : "noscore");
      if (hit) this.checkGameOver();
    });

    this.physics.add.overlap(this.player, this.enemyLasers, (_playerObj, laserObj) => {
      (laserObj as Phaser.Physics.Arcade.Image).destroy();
      if (this.player.takeHit()) this.checkGameOver();
    });

    this.physics.add.overlap(this.player, this.pickups, (_playerObj, pickupObj) => {
      const pickup = pickupObj as Pickup;
      this.collectPickup(pickup.kind);
      pickup.destroy();
    });
  }

  private buildHud(): void {
    this.ammoText = this.add
      .text(16, 14, "", { fontFamily: "monospace", fontSize: "18px", color: "#7cf7ff" })
      .setDepth(20);
    this.scoreText = this.add
      .text(GAME_WIDTH - 16, 14, "", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffcf5c",
      })
      .setOrigin(1, 0)
      .setDepth(20);

    this.rapidFireText = this.add
      .text(16, 40, "", { fontFamily: "monospace", fontSize: "13px", color: "#ffcf5c" })
      .setDepth(20);

    this.buildHealthBar();
    this.buildBossBar();

    const slotSize = 34;
    const totalWidth = POWERUP_SLOTS * (slotSize + 8) - 8;
    const startX = GAME_WIDTH / 2 - totalWidth / 2;
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 58, "POWER-UPS  [F]", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#9fb3c8",
      })
      .setOrigin(0.5)
      .setDepth(20);

    for (let i = 0; i < POWERUP_SLOTS; i++) {
      const x = startX + i * (slotSize + 8) + slotSize / 2;
      const y = GAME_HEIGHT - 32;
      const box = this.add
        .rectangle(x, y, slotSize, slotSize, 0x0b1626, 0.7)
        .setStrokeStyle(2, 0x2f4b6b)
        .setDepth(20);
      this.slotBoxes.push(box);
      this.slotIcons.push(null);
      this.slotTypes.push(undefined);
    }

    this.refreshHud();
  }

  private buildHealthBar(): void {
    const barX = GAME_WIDTH / 2 - this.healthBarWidth / 2;
    const barY = 23;

    this.add
      .text(barX - 10, barY, "HULL", { fontFamily: "monospace", fontSize: "12px", color: "#9fb3c8" })
      .setOrigin(1, 0.5)
      .setDepth(20);

    this.add
      .rectangle(barX, barY, this.healthBarWidth, this.healthBarHeight, 0x0b1626, 0.85)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0x2f4b6b)
      .setDepth(20);

    this.healthBarFill = this.add
      .rectangle(
        barX + 2,
        barY,
        this.healthBarWidth - 4,
        this.healthBarHeight - 4,
        0x4dffa0
      )
      .setOrigin(0, 0.5)
      .setDepth(21);

    this.healthBarFlash = this.add
      .rectangle(barX, barY, this.healthBarWidth, this.healthBarHeight, 0xffffff, 0)
      .setOrigin(0, 0.5)
      .setDepth(22);
  }

  private buildBossBar(): void {
    const barX = GAME_WIDTH / 2 - this.bossBarWidth / 2;
    const barY = 54;

    this.bossNameText = this.add
      .text(GAME_WIDTH / 2, barY - 14, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ff9ad6",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);

    const bg = this.add
      .rectangle(barX, barY, this.bossBarWidth, this.bossBarHeight, 0x0b1626, 0.85)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0x6b2f52)
      .setDepth(20)
      .setVisible(false);

    this.bossBarFill = this.add
      .rectangle(barX + 2, barY, this.bossBarWidth - 4, this.bossBarHeight - 4, 0xff4dc4)
      .setOrigin(0, 0.5)
      .setDepth(21)
      .setVisible(false);

    this.bossBarBg = bg;
  }

  private refreshHud(): void {
    this.ammoText.setText(`AMMO: ${Math.max(0, this.player.ammo)}`);
    this.scoreText.setText(`SCORE: ${this.score}`);

    const lives = Math.max(0, this.player.lives);
    const fraction = lives / this.player.maxLives;
    const innerWidth = Math.max(0, (this.healthBarWidth - 4) * fraction);
    this.healthBarFill.setSize(innerWidth, this.healthBarHeight - 4);
    this.healthBarFill.setFillStyle(
      fraction > 0.66 ? 0x4dffa0 : fraction > 0.33 ? 0xffcf5c : 0xff5d5d
    );

    if (lives < this.lastLives) {
      this.tweens.add({
        targets: this.healthBarFlash,
        alpha: { from: 0.85, to: 0 },
        duration: 250,
        ease: "Cubic.easeOut",
      });
    }
    this.lastLives = lives;

    if (this.player.isRapidFire) {
      const secondsLeft = Math.max(0, Math.ceil((this.player.rapidFireUntil - this.time.now) / 1000));
      this.rapidFireText.setText(`RAPID FIRE ${secondsLeft}s`).setVisible(true);
    } else {
      this.rapidFireText.setVisible(false);
    }

    for (let i = 0; i < POWERUP_SLOTS; i++) {
      const type = this.player.powerups[i];
      if (type === this.slotTypes[i]) continue; // unchanged — skip the churn

      const existing = this.slotIcons[i];
      if (existing) {
        existing.destroy();
        this.slotIcons[i] = null;
      }
      if (type) {
        const tex =
          type === "bomb" ? "bombPickup" : type === "shield" ? "shieldPickup" : "rapidFireIcon";
        const box = this.slotBoxes[i];
        this.slotIcons[i] = this.add
          .image(box.x, box.y, tex)
          .setScale(0.8)
          .setDepth(21);
      }
      this.slotTypes[i] = type;
    }

    if (this.boss) {
      const fraction = Phaser.Math.Clamp(this.boss.hp / this.boss.maxHp, 0, 1);
      this.bossBarFill.setSize(
        Math.max(0, (this.bossBarWidth - 4) * fraction),
        this.bossBarHeight - 4
      );
    }
  }

  private showBossBar(): void {
    if (!this.boss) return;
    this.bossNameText.setText(this.boss.bossName.toUpperCase()).setVisible(true);
    this.bossBarBg.setVisible(true);
    this.bossBarFill.setVisible(true);
  }

  private hideBossBar(): void {
    this.bossNameText.setVisible(false);
    this.bossBarBg.setVisible(false);
    this.bossBarFill.setVisible(false);
  }

  private showBanner(text: string, color: string): void {
    const banner = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.36, text, {
        fontFamily: "monospace",
        fontSize: "28px",
        color,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setAlpha(0);

    this.tweens.add({
      targets: banner,
      alpha: 1,
      duration: 200,
      yoyo: true,
      hold: 900,
      onComplete: () => banner.destroy(),
    });
  }

  private fireLaser(): void {
    const fired = this.player.tryFire(this.time.now);
    if (!fired) return;
    const laserDef = this.player.laser;
    const offset = 22;
    const count = laserDef.spreadCount;
    const perpAngle = fired.angle + Math.PI / 2;

    for (let i = 0; i < count; i++) {
      // t distributes bolts symmetrically around the aim line: -1..1 for 3,
      // -0.5/0.5 for 2, 0 for 1. Both angular fan and parallel offset share it,
      // so spreadAngleDeg/spreadOffsetPx both mean "gap between adjacent bolts".
      const t = count === 1 ? 0 : -((count - 1) / 2) + i;
      const angle = fired.angle + Phaser.Math.DegToRad(laserDef.spreadAngleDeg * t);
      const lateral = laserDef.spreadOffsetPx * t;

      const spawnX = this.player.x + Math.cos(fired.angle) * offset + Math.cos(perpAngle) * lateral;
      const spawnY = this.player.y + Math.sin(fired.angle) * offset + Math.sin(perpAngle) * lateral;

      const laser = this.playerLasers.create(spawnX, spawnY, laserDef.texture) as Phaser.Physics.Arcade.Image;
      laser.setRotation(angle);
      laser.setDepth(2);
      laser.setData("pierceLeft", laserDef.pierceCount);
      laser.setData("hitSet", new Set());
      laser.setData("damage", laserDef.damage);
      laser.setData("homing", laserDef.homing);
      if (this.player.isRapidFire) laser.setTint(0xffcf5c);
      this.physics.velocityFromRotation(angle, LASER_SPEED, laser.body!.velocity);
      this.time.delayedCall(1500, () => laser.active && laser.destroy());
    }
  }

  private findNearestHomingTarget(x: number, y: number): { x: number; y: number } | null {
    let nearest: { x: number; y: number } | null = null;
    let nearestDist = Infinity;

    for (const enemyObj of this.enemies.getChildren()) {
      const enemy = enemyObj as Enemy;
      if (!enemy.active) continue;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }

    if (this.boss && this.boss.active) {
      const dist = Phaser.Math.Distance.Between(x, y, this.boss.x, this.boss.y);
      if (dist < nearestDist) nearest = this.boss;
    }

    return nearest;
  }

  private pickEnemyKind(): EnemyKind {
    const roll = Math.random();
    const w = this.level.weights;
    if (roll < w.extra) return "extra";
    if (roll < w.extra + w.shooter) return "shooter";
    return "enemy";
  }

  private spawnEnemy(): void {
    if (this.gameOver) return;
    const kind = this.pickEnemyKind();

    const margin = 30;
    const x = Phaser.Math.Between(margin, GAME_WIDTH - margin);
    const enemy = new Enemy(this, x, -30, kind);
    this.enemies.add(enemy);
    enemy.launch();
  }

  private spawnPickup(): void {
    if (this.gameOver) return;
    const roll = Math.random();
    let kind: PickupKind = "ammo";
    if (roll > 0.85) kind = "shield";
    else if (roll > 0.65) kind = "random";
    else if (roll > 0.5) kind = "bomb";

    const margin = 30;
    const x = Phaser.Math.Between(margin, GAME_WIDTH - margin);
    const pickup = new Pickup(this, x, -20, kind);
    this.pickups.add(pickup);
    pickup.launch();
  }

  private spawnBoss(): void {
    this.bossActive = true;
    this.enemySpawnTimer.paused = true;
    this.pickupSpawnTimer.paused = true;
    this.showBanner(`${this.level.bossName.toUpperCase()} INCOMING`, "#ff4dc4");

    this.time.delayedCall(1400, () => {
      if (this.gameOver) return;
      const hp = this.level.bossHp + this.bossesDefeated * 25;
      this.boss = new Boss(this, GAME_WIDTH / 2, -80, {
        name: this.level.bossName,
        hp,
        fireCooldownMs: this.level.bossFireCooldownMs,
      });

      this.bossLaserOverlap = this.physics.add.overlap(
        this.playerLasers,
        this.boss,
        (laserObj, bossObj) => {
          const laser = laserObj as Phaser.Physics.Arcade.Image;
          const boss = bossObj as Boss;
          if (!this.registerLaserHit(laser, boss)) return;
          const died = boss.applyDamage(laser.getData("damage") as number);
          this.refreshHud();
          if (died) this.killBoss();
        }
      );
      this.bossPlayerOverlap = this.physics.add.overlap(this.player, this.boss, () => {
        if (this.player.takeHit()) this.checkGameOver();
      });

      this.showBossBar();
    });
  }

  private fireBossVolley(): void {
    if (!this.boss) return;
    const baseAngle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
    for (let i = 0; i < BOSS_VOLLEY_COUNT; i++) {
      const offsetDeg =
        -BOSS_VOLLEY_SPREAD_DEG / 2 + (BOSS_VOLLEY_SPREAD_DEG / (BOSS_VOLLEY_COUNT - 1)) * i;
      const angle = baseAngle + Phaser.Math.DegToRad(offsetDeg);
      const laser = this.enemyLasers.create(
        this.boss.x,
        this.boss.y + 20,
        "bossLaser"
      ) as Phaser.Physics.Arcade.Image;
      laser.setRotation(angle);
      laser.setDepth(2);
      this.physics.velocityFromRotation(angle, BOSS_LASER_SPEED, laser.body!.velocity);
    }
  }

  /** Telegraphs (with an expanding warning ring) then fires a single fast, aimed beam. */
  private chargeBossBeam(): void {
    if (!this.boss) return;
    this.boss.isCharging = true;

    // Transparent-fill, thick amber ring: reads as a distinct warning against
    // both the magenta boss body and the dark background, unlike a filled
    // circle which just blends into the boss's own glowing core.
    const warn = this.add
      .circle(this.boss.x, this.boss.y, 46, 0xffe066, 0)
      .setStrokeStyle(4, 0xffe066, 0.95)
      .setDepth(5);
    this.tweens.add({
      targets: warn,
      scale: { from: 0.75, to: 1.5 },
      alpha: { from: 1, to: 0 },
      duration: BOSS_BEAM_TELEGRAPH_MS,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        if (this.boss) warn.setPosition(this.boss.x, this.boss.y);
      },
      onComplete: () => warn.destroy(),
    });

    this.time.delayedCall(BOSS_BEAM_TELEGRAPH_MS, () => {
      if (!this.boss) return;
      this.boss.isCharging = false;
      this.fireBossBeam();
    });
  }

  private fireBossBeam(): void {
    if (!this.boss) return;
    const angle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
    const laser = this.enemyLasers.create(
      this.boss.x,
      this.boss.y + 20,
      "bossBeam"
    ) as Phaser.Physics.Arcade.Image;
    laser.setRotation(angle);
    laser.setDepth(2);
    this.physics.velocityFromRotation(angle, BOSS_BEAM_SPEED, laser.body!.velocity);
  }

  private killBoss(): void {
    const boss = this.boss;
    if (!boss) return;

    this.score += SCORE.boss + this.bossesDefeated * 100;
    this.bossesDefeated += 1;
    this.bossThreshold = this.score + this.level.bossScoreThreshold;

    this.spawnExplosion(boss.x, boss.y);
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 120, () =>
        this.spawnExplosion(boss.x + Phaser.Math.Between(-30, 30), boss.y + Phaser.Math.Between(-20, 20))
      );
    }

    const kinds: PickupKind[] = ["shield", "bomb", "random", "ammo"];
    for (let i = 0; i < 3; i++) {
      const kind = Phaser.Utils.Array.GetRandom(kinds);
      const drop = new Pickup(this, boss.x + (i - 1) * 40, boss.y, kind);
      this.pickups.add(drop);
      drop.launch();
    }

    boss.destroy();
    this.boss = null;
    this.bossLaserOverlap?.destroy();
    this.bossPlayerOverlap?.destroy();
    this.bossLaserOverlap = undefined;
    this.bossPlayerOverlap = undefined;
    this.hideBossBar();
    this.showBanner(`${this.level.bossName.toUpperCase()} DEFEATED`, "#4dffa0");

    this.bossActive = false;
    this.enemySpawnTimer.paused = false;
    this.pickupSpawnTimer.paused = false;
    this.refreshHud();
  }

  private killEnemy(enemy: Enemy, mode?: "noscore"): void {
    if (!enemy.active) return;
    if (mode !== "noscore") {
      this.score += enemy.scoreValue;
      if (enemy.kind === "extra") {
        const kinds: PickupKind[] = ["ammo", "shield", "bomb", "random"];
        const kind = Phaser.Utils.Array.GetRandom(kinds);
        const drop = new Pickup(this, enemy.x, enemy.y, kind);
        this.pickups.add(drop);
        drop.launch();
      }
    }
    this.spawnExplosion(enemy.x, enemy.y);
    enemy.destroy();
  }

  private spawnExplosion(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const spark = this.add.image(x, y, "spark").setDepth(3);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(16, 40);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 300,
        onComplete: () => spark.destroy(),
      });
    }
  }

  private collectPickup(kind: PickupKind): void {
    switch (kind) {
      case "ammo":
        this.player.addAmmo(AMMO_PACK_AMOUNT);
        break;
      case "bomb":
      case "shield":
        this.player.addPowerup(kind);
        break;
      case "random": {
        const roll = Math.random();
        if (roll < 0.35) {
          this.player.addAmmo(AMMO_BURST_AMOUNT);
        } else if (roll < 0.6) {
          this.player.addPowerup("rapidFire");
        } else if (roll < 0.8) {
          this.player.addPowerup("shield");
        } else {
          this.player.addPowerup("bomb");
        }
        break;
      }
    }
    this.refreshHud();
  }

  private usePowerup(): void {
    const type: PowerupType | null = this.player.useNextPowerup();
    if (!type) return;
    if (type === "bomb") {
      const active = this.enemies.getChildren().slice() as Enemy[];
      for (const enemy of active) this.killEnemy(enemy);
      if (this.boss) {
        const died = this.boss.applyDamage(15);
        if (died) this.killBoss();
      }
    } else if (type === "shield") {
      this.player.activateShield();
    } else if (type === "rapidFire") {
      this.player.activateRapidFire(RAPID_FIRE_DURATION_MS);
    }
    this.refreshHud();
  }

  private checkGameOver(): void {
    this.refreshHud();
    if (this.player.lives <= 0 && !this.gameOver) {
      this.gameOver = true;
      this.time.delayedCall(400, () => {
        this.scene.start("GameOver", {
          score: this.score,
          characterId: this.character.id,
          laserId: this.laser.id,
          levelId: this.level.id,
        });
      });
    }
  }

  update(_time: number, delta: number): void {
    if (this.gameOver) return;
    this.elapsedMs += delta;

    for (const star of this.stars) {
      star.img.y += (star.speed * delta) / 1000;
      if (star.img.y > GAME_HEIGHT) {
        star.img.y = 0;
        star.img.x = Phaser.Math.Between(0, GAME_WIDTH);
      }
    }

    const pointer = this.input.activePointer;
    this.player.aimAt(pointer.worldX, pointer.worldY);
    this.player.handleMovement({
      up: this.cursors.up!.isDown || this.wasd.W.isDown,
      down: this.cursors.down!.isDown || this.wasd.S.isDown,
      left: this.cursors.left!.isDown || this.wasd.A.isDown,
      right: this.cursors.right!.isDown || this.wasd.D.isDown,
    });

    if (this.keySpace.isDown || pointer.isDown) this.fireLaser();
    if (Phaser.Input.Keyboard.JustDown(this.keyF)) this.usePowerup();

    if (!this.bossActive && this.score >= this.bossThreshold) {
      this.spawnBoss();
    }

    if (this.boss && this.boss.isPatrolling && !this.boss.isCharging) {
      if (this.time.now > this.boss.lastFiredAt + this.boss.fireCooldownMs) {
        this.boss.lastFiredAt = this.time.now;
        this.boss.attackCount += 1;
        if (this.boss.attackCount % BOSS_BEAM_EVERY_NTH_ATTACK === 0) {
          this.chargeBossBeam();
        } else {
          this.fireBossVolley();
        }
      }
    }

    for (const enemyObj of this.enemies.getChildren()) {
      const enemy = enemyObj as Enemy;
      if (enemy.y > GAME_HEIGHT + 40) {
        enemy.destroy();
        continue;
      }
      if (enemy.kind === "shooter" && enemy.y > 0 && enemy.y < GAME_HEIGHT) {
        if (this.time.now > enemy.lastFiredAt + enemy.fireCooldownMs) {
          enemy.lastFiredAt = this.time.now;
          this.fireEnemyLaser(enemy);
        }
      }
    }

    for (const laserObj of this.enemyLasers.getChildren()) {
      const laser = laserObj as Phaser.Physics.Arcade.Image;
      if (laser.y > GAME_HEIGHT + 20 || laser.y < -20) laser.destroy();
    }

    for (const laserObj of this.playerLasers.getChildren()) {
      const laser = laserObj as Phaser.Physics.Arcade.Image;
      if (laser.x < -20 || laser.x > GAME_WIDTH + 20 || laser.y < -20 || laser.y > GAME_HEIGHT + 20) {
        laser.destroy();
        continue;
      }
      if (!laser.getData("homing")) continue;
      const target = this.findNearestHomingTarget(laser.x, laser.y);
      if (!target) continue;
      const desiredAngle = Phaser.Math.Angle.Between(laser.x, laser.y, target.x, target.y);
      const newAngle = Phaser.Math.Angle.RotateTo(laser.rotation, desiredAngle, HOMING_TURN_RATE * (delta / 1000));
      laser.setRotation(newAngle);
      this.physics.velocityFromRotation(newAngle, LASER_SPEED, laser.body!.velocity);
    }

    for (const pickupObj of this.pickups.getChildren()) {
      const pickup = pickupObj as Pickup;
      if (pickup.y > GAME_HEIGHT + 20) pickup.destroy();
    }

    this.refreshHud();
  }

  private fireEnemyLaser(enemy: Enemy): void {
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    const laser = this.enemyLasers.create(enemy.x, enemy.y + 10, "enemyLaser") as Phaser.Physics.Arcade.Image;
    laser.setRotation(angle);
    laser.setDepth(2);
    this.physics.velocityFromRotation(angle, ENEMY_LASER_SPEED, laser.body!.velocity);
  }
}
