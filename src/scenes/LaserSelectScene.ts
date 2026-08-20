import Phaser from "phaser";
import { CHARACTERS, GAME_HEIGHT, GAME_WIDTH, LASERS, type LaserDef } from "../config";

const CHIP_WIDTH = 112;
const CHIP_HEIGHT = 92;
const CHIP_GAP = 14;
const CHIP_TOP = 112;

const DETAIL_TOP = 226;
const DETAIL_HEIGHT = 320;
const DETAIL_WIDTH = 620;

interface LaserSelectData {
  characterId?: string;
}

interface StatRow {
  label: string;
  fraction: number;
}

function normalize(value: number, min: number, max: number): number {
  return Phaser.Math.Clamp((value - min) / (max - min), 0, 1);
}

function statsFor(laser: LaserDef): StatRow[] {
  return [
    { label: "DAMAGE", fraction: normalize(laser.damage, 1, 2) },
    { label: "POWER", fraction: normalize(laser.spreadCount, 1, 3) },
    { label: "PIERCE", fraction: normalize(laser.pierceCount, 1, 3) },
    { label: "RATE", fraction: 1 - normalize(laser.fireCooldownMult, 1, 1.6) },
    { label: "AMMO/SHOT", fraction: 1 - normalize(laser.ammoCost, 1, 3) },
  ];
}

export class LaserSelectScene extends Phaser.Scene {
  private characterId!: string;
  private selectedIndex = 0;
  private chips: Phaser.GameObjects.Rectangle[] = [];
  private detailObjects: Phaser.GameObjects.GameObject[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { A: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private keyEnter!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyBackspace!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("LaserSelect");
  }

  create(data: LaserSelectData): void {
    this.characterId = data.characterId ?? CHARACTERS[0].id;
    this.selectedIndex = 0;
    this.chips = [];
    this.detailObjects = [];
    this.cameras.main.setBackgroundColor(0x05070d);

    for (let i = 0; i < 60; i++) {
      this.add
        .image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT), "star")
        .setAlpha(Phaser.Math.FloatBetween(0.3, 1))
        .setScale(Phaser.Math.FloatBetween(0.5, 1.6));
    }

    this.add
      .text(GAME_WIDTH / 2, 50, "SELECT YOUR LASER", {
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#7cf7ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const character = CHARACTERS.find((c) => c.id === this.characterId) ?? CHARACTERS[0];
    this.add
      .text(GAME_WIDTH / 2, 84, `FLYING: ${character.name.toUpperCase()}`, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#9fb3c8",
      })
      .setOrigin(0.5);

    const totalWidth = LASERS.length * CHIP_WIDTH + (LASERS.length - 1) * CHIP_GAP;
    const startX = GAME_WIDTH / 2 - totalWidth / 2;

    LASERS.forEach((laser, i) => {
      const cx = startX + i * (CHIP_WIDTH + CHIP_GAP) + CHIP_WIDTH / 2;
      this.buildChip(laser, i, cx);
    });

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 34, "←/→ SELECT   ENTER OR CLICK TO CONFIRM   BACKSPACE: BACK", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#9fb3c8",
      })
      .setOrigin(0.5);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      A: this.input.keyboard!.addKey("A"),
      D: this.input.keyboard!.addKey("D"),
    };
    this.keyEnter = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.keySpace = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyBackspace = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);

    this.keySpace.on("down", () => this.confirm());
    this.keyEnter.on("down", () => this.confirm());
    this.keyBackspace.on("down", () => this.scene.start("CharacterSelect"));
    this.cursors.left!.on("down", () => this.moveSelection(-1));
    this.cursors.right!.on("down", () => this.moveSelection(1));
    this.wasd.A.on("down", () => this.moveSelection(-1));
    this.wasd.D.on("down", () => this.moveSelection(1));

    this.refresh();
  }

  private moveSelection(delta: number): void {
    this.selectedIndex = (this.selectedIndex + delta + LASERS.length) % LASERS.length;
    this.refresh();
  }

  private buildChip(laser: LaserDef, index: number, cx: number): void {
    const cy = CHIP_TOP + CHIP_HEIGHT / 2;

    const chip = this.add
      .rectangle(cx, cy, CHIP_WIDTH, CHIP_HEIGHT, 0x0b1626, 0.85)
      .setStrokeStyle(2, 0x2f4b6b)
      .setInteractive({ useHandCursor: true })
      .setDepth(1);
    this.chips.push(chip);

    chip.on("pointerover", () => {
      this.selectedIndex = index;
      this.refresh();
    });
    chip.on("pointerdown", () => {
      this.selectedIndex = index;
      this.confirm();
    });

    this.add.image(cx, CHIP_TOP + 30, laser.texture).setScale(1.4).setAngle(-90).setDepth(2);

    this.add
      .text(cx, CHIP_TOP + 58, laser.name.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "10px",
        color: Phaser.Display.Color.IntegerToColor(laser.color).rgba,
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: CHIP_WIDTH - 12 },
      })
      .setOrigin(0.5, 0)
      .setDepth(2);
  }

  private renderDetail(): void {
    this.detailObjects.forEach((obj) => obj.destroy());
    this.detailObjects = [];

    const laser = LASERS[this.selectedIndex];
    const panelCx = GAME_WIDTH / 2;
    const panelCy = DETAIL_TOP + DETAIL_HEIGHT / 2;

    const panel = this.add
      .rectangle(panelCx, panelCy, DETAIL_WIDTH, DETAIL_HEIGHT, 0x0f1e33, 0.95)
      .setStrokeStyle(3, laser.color)
      .setDepth(1);
    this.detailObjects.push(panel);

    const leftCx = panelCx - DETAIL_WIDTH / 2 + 110;
    const boltY = DETAIL_TOP + 90;
    const count = laser.spreadCount;
    for (let b = 0; b < count; b++) {
      const t = count === 1 ? 0 : -((count - 1) / 2) + b;
      const offsetDeg = laser.spreadAngleDeg * t;
      const offsetPx = laser.spreadOffsetPx * t;
      const img = this.add
        .image(leftCx + offsetPx * 1.4, boltY, laser.texture)
        .setScale(1.8)
        .setAngle(-90 + offsetDeg)
        .setDepth(2);
      this.detailObjects.push(img);
    }

    if (laser.homing) {
      const badge = this.add
        .text(leftCx, boltY + 60, "AUTO-TRACKING", {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#4dffa0",
          backgroundColor: "#0b1f16",
          padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5)
        .setDepth(2);
      this.detailObjects.push(badge);
    }

    const textLeft = panelCx - DETAIL_WIDTH / 2 + 210;
    const name = this.add
      .text(textLeft, DETAIL_TOP + 34, laser.name.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "20px",
        color: Phaser.Display.Color.IntegerToColor(laser.color).rgba,
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5)
      .setDepth(2);
    this.detailObjects.push(name);

    const tagline = this.add
      .text(textLeft, DETAIL_TOP + 64, laser.tagline, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#9fb3c8",
        wordWrap: { width: DETAIL_WIDTH - 250 },
      })
      .setOrigin(0, 0)
      .setDepth(2);
    this.detailObjects.push(tagline);

    const statStartY = DETAIL_TOP + 120;
    const rowHeight = 32;
    const barWidth = 220;
    const labelWidth = 80;

    statsFor(laser).forEach((stat, row) => {
      const y = statStartY + row * rowHeight;

      const label = this.add
        .text(textLeft, y, stat.label, {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#6f88a3",
        })
        .setOrigin(0, 0.5)
        .setDepth(2);
      this.detailObjects.push(label);

      const barX = textLeft + labelWidth;
      const bg = this.add
        .rectangle(barX, y, barWidth, 10, 0x081018, 1)
        .setOrigin(0, 0.5)
        .setStrokeStyle(1, 0x2f4b6b)
        .setDepth(2);
      this.detailObjects.push(bg);

      const fill = this.add
        .rectangle(barX + 1, y, Math.max(3, (barWidth - 2) * stat.fraction), 8, laser.color, 1)
        .setOrigin(0, 0.5)
        .setDepth(3);
      this.detailObjects.push(fill);
    });
  }

  private refresh(): void {
    this.chips.forEach((chip, i) => {
      const laser = LASERS[i];
      if (i === this.selectedIndex) {
        chip.setStrokeStyle(3, laser.color);
        chip.setFillStyle(0x0f1e33, 0.95);
        this.tweens.add({ targets: chip, scale: 1.06, duration: 120, ease: "Cubic.easeOut" });
      } else {
        chip.setStrokeStyle(2, 0x2f4b6b);
        chip.setFillStyle(0x0b1626, 0.85);
        this.tweens.add({ targets: chip, scale: 1, duration: 120, ease: "Cubic.easeOut" });
      }
    });
    this.renderDetail();
  }

  private confirm(): void {
    const laser = LASERS[this.selectedIndex];
    this.scene.start("LevelSelect", { characterId: this.characterId, laserId: laser.id });
  }
}
