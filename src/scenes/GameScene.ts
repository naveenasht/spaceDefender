import Phaser from "phaser";
import {
  AMMO_BURST_AMOUNT,
  AMMO_PACK_AMOUNT,
  ENEMY_LASER_SPEED,
  GAME_HEIGHT,
  GAME_WIDTH,
  LASER_AMMO_COST,
  LASER_SPEED,
  PLAYER_START_LIVES,
  POWERUP_SLOTS,
  type PowerupType,
} from "../config";
import { Player } from "../objects/Player";
import { Enemy, type EnemyKind } from "../objects/Enemy";
import { Pickup, type PickupKind } from "../objects/Pickup";

const RAPID_FIRE_DURATION_MS = 6000;

export class GameScene extends Phaser.Scene {
  private player!: Player;
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
  private lastLives = PLAYER_START_LIVES;
  private slotBoxes: Phaser.GameObjects.Rectangle[] = [];
  private slotIcons: (Phaser.GameObjects.Image | null)[] = [];

  constructor() {
    super("Game");
  }

  create(): void {
    this.score = 0;
    this.elapsedMs = 0;
    this.gameOver = false;

    this.createStarfield();

    this.enemies = this.physics.add.group({ classType: Enemy, runChildUpdate: true });
    this.playerLasers = this.physics.add.group();
    this.enemyLasers = this.physics.add.group();
    this.pickups = this.physics.add.group({ classType: Pickup, runChildUpdate: false });

    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 80);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey("W"),
      A: this.input.keyboard!.addKey("A"),
      S: this.input.keyboard!.addKey("S"),
      D: this.input.keyboard!.addKey("D"),
    };
    this.keyF = this.input.keyboard!.addKey("F");
    this.keySpace = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.time.addEvent({ delay: 900, loop: true, callback: () => this.spawnEnemy() });
    this.time.addEvent({ delay: 4200, loop: true, callback: () => this.spawnPickup() });

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

  private setupCollisions(): void {
    this.physics.add.overlap(this.playerLasers, this.enemies, (laserObj, enemyObj) => {
      const laser = laserObj as Phaser.Physics.Arcade.Image;
      const enemy = enemyObj as Enemy;
      laser.destroy();
      const died = enemy.applyDamage(1);
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

  private refreshHud(): void {
    this.ammoText.setText(`AMMO: ${Math.max(0, this.player.ammo)}`);
    this.scoreText.setText(`SCORE: ${this.score}`);

    const lives = Math.max(0, this.player.lives);
    const fraction = lives / PLAYER_START_LIVES;
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
    }
  }

  private fireLaser(): void {
    const fired = this.player.tryFire(this.time.now);
    if (!fired) return;
    const offset = 22;
    const laser = this.playerLasers.create(
      this.player.x + Math.cos(fired.angle) * offset,
      this.player.y + Math.sin(fired.angle) * offset,
      "playerLaser"
    ) as Phaser.Physics.Arcade.Image;
    laser.setRotation(fired.angle);
    laser.setDepth(2);
    if (this.player.isRapidFire) laser.setTint(0xffcf5c);
    this.physics.velocityFromRotation(fired.angle, LASER_SPEED, laser.body!.velocity);
    this.time.delayedCall(1500, () => laser.active && laser.destroy());
    void LASER_AMMO_COST;
  }

  private spawnEnemy(): void {
    if (this.gameOver) return;
    const roll = Math.random();
    let kind: EnemyKind = "enemy";
    if (roll > 0.9) kind = "extra";
    else if (roll > 0.65) kind = "shooter";

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
        this.scene.start("GameOver", { score: this.score });
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
