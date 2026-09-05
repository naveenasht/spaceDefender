import Phaser from "phaser";
import { CHARACTERS } from "../config";

/**
 * Generates every sprite as a vector shape at boot time so the game
 * ships with zero external image assets.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create(): void {
    for (const character of CHARACTERS) {
      this.makePlayer(character.texture, character.color, character.edgeColor);
    }
    this.makeEnemy("enemy", 0xff4d4d, 0xffb3b3, 34);
    this.makeEnemy("enemyShooter", 0xff9a3d, 0xffe0b3, 38);
    this.makeEnemy("enemyExtra", 0xb84dff, 0xf0d9ff, 44);

    this.makeLaser("playerLaser", 0x7cf7ff, 0xffffff, 18, 4);
    this.makeLaser("enemyLaser", 0xff5d5d, 0xffd6d6, 14, 4);
    this.makeLaser("bossLaser", 0xff4dc4, 0xffd6f5, 20, 5);
    this.makeLaser("bossBeam", 0xff2e9e, 0xffffff, 38, 9);
    this.makeLaser("laserSpread", 0xffcf5c, 0xfff0c9, 15, 4);
    this.makeLaser("laserPierce", 0xb84dff, 0xf0d9ff, 26, 5);
    this.makeLaser("laserTwin", 0x4da6ff, 0xd6ecff, 16, 4);
    this.makeLaser("laserCannon", 0xff5d5d, 0xffd6d6, 24, 8);
    this.makeHomingBolt();
    this.makeBoss();

    this.makeAmmoPickup();
    this.makeBombPickup();
    this.makeRandomPickup();
    this.makeShieldPickup();
    this.makeRapidFireIcon();
    this.makeShieldFx();
    this.makeStar();
    this.makeParticle();

    this.scene.start("Menu");
  }

  private makePlayer(key: string, fill: number, edge: number): void {
    const g = this.add.graphics();
    const w = 40;
    const h = 34;
    g.fillStyle(fill, 1);
    g.lineStyle(2, edge, 1);
    // Nose points right (rotation 0 = facing right, matches pointer-aim math)
    g.beginPath();
    g.moveTo(w, h / 2);
    g.lineTo(0, 0);
    g.lineTo(w * 0.35, h / 2);
    g.lineTo(0, h);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(w * 0.55, h / 2, 3);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeEnemy(key: string, fill: number, edge: number, size: number): void {
    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.lineStyle(2, edge, 1);
    // Nose points down (toward the player)
    g.beginPath();
    g.moveTo(size / 2, size);
    g.lineTo(0, 0);
    g.lineTo(size, 0);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private makeBoss(): void {
    const g = this.add.graphics();
    const w = 110;
    const h = 80;
    g.fillStyle(0x7a1740, 1);
    g.lineStyle(3, 0xff6fd8, 1);
    // Wide hull tapering to a nose pointing down, toward the player
    g.beginPath();
    g.moveTo(w * 0.5, h);
    g.lineTo(w * 0.14, h * 0.55);
    g.lineTo(0, h * 0.12);
    g.lineTo(w * 0.32, 0);
    g.lineTo(w * 0.68, 0);
    g.lineTo(w, h * 0.12);
    g.lineTo(w * 0.86, h * 0.55);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.fillStyle(0xffb8ec, 0.9);
    g.fillCircle(w * 0.5, h * 0.42, 14);
    g.fillStyle(0xffe9fb, 1);
    g.fillCircle(w * 0.5, h * 0.42, 6);

    g.fillStyle(0xff6fd8, 1);
    g.fillCircle(w * 0.28, h * 0.26, 4);
    g.fillCircle(w * 0.72, h * 0.26, 4);

    g.generateTexture("boss", w, h);
    g.destroy();
  }

  private makeLaser(key: string, fill: number, edge: number, len: number, thick: number): void {
    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.lineStyle(1, edge, 1);
    g.fillRoundedRect(0, 0, len, thick, thick / 2);
    g.strokeRoundedRect(0, 0, len, thick, thick / 2);
    g.generateTexture(key, len, thick);
    g.destroy();
  }

  private makeHomingBolt(): void {
    const g = this.add.graphics();
    const s = 15;
    g.fillStyle(0x4dffa0, 1);
    g.lineStyle(1, 0xd6ffe9, 1);
    // A diamond seeker reads clearly at any rotation, unlike a directional bolt
    g.beginPath();
    g.moveTo(s, s / 2);
    g.lineTo(s / 2, 0);
    g.lineTo(0, s / 2);
    g.lineTo(s / 2, s);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(s / 2, s / 2, 2);
    g.generateTexture("laserHoming", s, s);
    g.destroy();
  }

  private makeAmmoPickup(): void {
    const g = this.add.graphics();
    const s = 26;
    g.fillStyle(0x4dffa0, 1);
    g.lineStyle(2, 0xd6ffe9, 1);
    g.fillRoundedRect(0, 0, s, s * 0.7, 4);
    g.strokeRoundedRect(0, 0, s, s * 0.7, 4);
    g.fillStyle(0x0b3d24, 1);
    g.fillRect(s * 0.15, s * 0.15, s * 0.7, s * 0.12);
    g.fillRect(s * 0.4, s * 0.05, s * 0.2, s * 0.25);
    g.generateTexture("ammoPickup", s, s * 0.7);
    g.destroy();
  }

  private makeBombPickup(): void {
    const g = this.add.graphics();
    const s = 28;
    g.fillStyle(0x2b2b2b, 1);
    g.lineStyle(2, 0x8a8a8a, 1);
    g.fillCircle(s / 2, s / 2 + 3, s / 2 - 3);
    g.strokeCircle(s / 2, s / 2 + 3, s / 2 - 3);
    g.lineStyle(2, 0xffb84d, 1);
    g.beginPath();
    g.moveTo(s / 2, s / 2 - s / 2 + 3);
    g.lineTo(s / 2 + 4, 2);
    g.strokePath();
    g.fillStyle(0xffb84d, 1);
    g.fillCircle(s / 2 + 4, 2, 2.5);
    g.generateTexture("bombPickup", s, s);
    g.destroy();
  }

  private makeRandomPickup(): void {
    const g = this.add.graphics();
    const s = 26;
    g.fillStyle(0xb84dff, 1);
    g.lineStyle(2, 0xf0d9ff, 1);
    g.fillRoundedRect(0, 0, s, s, 5);
    g.strokeRoundedRect(0, 0, s, s, 5);
    g.lineStyle(2, 0xffffff, 1);
    g.beginPath();
    g.arc(s / 2, s * 0.42, s * 0.2, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(90), true);
    g.moveTo(s / 2, s * 0.62);
    g.lineTo(s / 2, s * 0.68);
    g.strokePath();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(s / 2, s * 0.82, 1.6);
    g.generateTexture("randomPickup", s, s);
    g.destroy();
  }

  private makeShieldPickup(): void {
    const g = this.add.graphics();
    const s = 28;
    g.fillStyle(0x4de8ff, 1);
    g.lineStyle(2, 0xe0fbff, 1);
    g.beginPath();
    g.moveTo(s / 2, 0);
    g.lineTo(s, s * 0.28);
    g.lineTo(s, s * 0.68);
    g.lineTo(s / 2, s);
    g.lineTo(0, s * 0.68);
    g.lineTo(0, s * 0.28);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.generateTexture("shieldPickup", s, s);
    g.destroy();
  }

  private makeRapidFireIcon(): void {
    const g = this.add.graphics();
    const s = 26;
    g.fillStyle(0xffcf5c, 1);
    g.lineStyle(2, 0xfff0c9, 1);
    g.beginPath();
    g.moveTo(s * 0.58, 0);
    g.lineTo(s * 0.18, s * 0.55);
    g.lineTo(s * 0.44, s * 0.55);
    g.lineTo(s * 0.32, s);
    g.lineTo(s * 0.86, s * 0.4);
    g.lineTo(s * 0.56, s * 0.4);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.generateTexture("rapidFireIcon", s, s);
    g.destroy();
  }

  private makeShieldFx(): void {
    const g = this.add.graphics();
    const s = 70;
    g.lineStyle(3, 0x4de8ff, 0.85);
    g.strokeCircle(s / 2, s / 2, s / 2 - 3);
    g.lineStyle(1, 0x4de8ff, 0.35);
    g.strokeCircle(s / 2, s / 2, s / 2 - 8);
    g.generateTexture("shieldFx", s, s);
    g.destroy();
  }

  private makeStar(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(2, 2, 2);
    g.generateTexture("star", 4, 4);
    g.destroy();
  }

  private makeParticle(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffcf5c, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("spark", 8, 8);
    g.destroy();
  }
}
