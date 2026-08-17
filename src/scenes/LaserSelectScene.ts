import Phaser from "phaser";
import { CHARACTERS, GAME_HEIGHT, GAME_WIDTH, LASERS, type LaserDef } from "../config";

const CARD_WIDTH = 200;
const CARD_HEIGHT = 320;
const CARD_GAP = 30;
const CARD_TOP = 150;

interface StatRow {
  label: string;
  fraction: number;
}

interface LaserSelectData {
  characterId?: string;
}

function normalize(value: number, min: number, max: number): number {
  return Phaser.Math.Clamp((value - min) / (max - min), 0, 1);
}

function statsFor(laser: LaserDef): StatRow[] {
  return [
    { label: "POWER", fraction: normalize(laser.spreadCount, 1, 3) },
    { label: "PIERCE", fraction: normalize(laser.pierceCount, 1, 3) },
    { label: "RATE", fraction: 1 - normalize(laser.fireCooldownMult, 0.65, 1.35) },
    { label: "AMMO/SHOT", fraction: 1 - normalize(laser.ammoCost, 1, 2) },
  ];
}

export class LaserSelectScene extends Phaser.Scene {
  private characterId!: string;
  private selectedIndex = 0;
  private panels: Phaser.GameObjects.Rectangle[] = [];
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
    this.panels = [];
    this.cameras.main.setBackgroundColor(0x05070d);

    for (let i = 0; i < 60; i++) {
      this.add
        .image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT), "star")
        .setAlpha(Phaser.Math.FloatBetween(0.3, 1))
        .setScale(Phaser.Math.FloatBetween(0.5, 1.6));
    }

    this.add
      .text(GAME_WIDTH / 2, 60, "SELECT YOUR LASER", {
        fontFamily: "monospace",
        fontSize: "32px",
        color: "#7cf7ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const character = CHARACTERS.find((c) => c.id === this.characterId) ?? CHARACTERS[0];
    this.add
      .text(GAME_WIDTH / 2, 98, `FLYING: ${character.name.toUpperCase()}`, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#9fb3c8",
      })
      .setOrigin(0.5);

    const totalWidth = LASERS.length * CARD_WIDTH + (LASERS.length - 1) * CARD_GAP;
    const startX = GAME_WIDTH / 2 - totalWidth / 2;

    LASERS.forEach((laser, i) => {
      const cx = startX + i * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;
      this.buildCard(laser, i, cx);
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

    this.highlight();
  }

  private buildCard(laser: LaserDef, index: number, cx: number): void {
    const cy = CARD_TOP + CARD_HEIGHT / 2;

    const panel = this.add
      .rectangle(cx, cy, CARD_WIDTH, CARD_HEIGHT, 0x0b1626, 0.85)
      .setStrokeStyle(2, 0x2f4b6b)
      .setInteractive({ useHandCursor: true })
      .setDepth(1);
    this.panels.push(panel);

    panel.on("pointerover", () => {
      this.selectedIndex = index;
      this.highlight();
    });
    panel.on("pointerdown", () => {
      this.selectedIndex = index;
      this.confirm();
    });

    const boltY = CARD_TOP + 50;
    const count = laser.spreadCount;
    for (let b = 0; b < count; b++) {
      const offsetDeg = count === 1 ? 0 : -laser.spreadAngleDeg * ((count - 1) / 2) + laser.spreadAngleDeg * b;
      this.add
        .image(cx + offsetDeg * 1.6, boltY, laser.texture)
        .setScale(1.6)
        .setAngle(-90 + offsetDeg)
        .setDepth(2);
    }

    this.add
      .text(cx, CARD_TOP + 92, laser.name.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "15px",
        color: Phaser.Display.Color.IntegerToColor(laser.color).rgba,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(cx, CARD_TOP + 114, laser.tagline, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#9fb3c8",
        align: "center",
        wordWrap: { width: CARD_WIDTH - 24 },
      })
      .setOrigin(0.5, 0)
      .setDepth(2);

    const statStartY = CARD_TOP + 172;
    const rowHeight = 30;
    const barWidth = 110;
    const barX = cx - CARD_WIDTH / 2 + 70;

    statsFor(laser).forEach((stat, row) => {
      const y = statStartY + row * rowHeight;
      this.add
        .text(cx - CARD_WIDTH / 2 + 16, y, stat.label, {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#6f88a3",
        })
        .setOrigin(0, 0.5)
        .setDepth(2);

      this.add
        .rectangle(barX, y, barWidth - 12, 8, 0x081018, 1)
        .setOrigin(0, 0.5)
        .setStrokeStyle(1, 0x2f4b6b)
        .setDepth(2);

      this.add
        .rectangle(barX + 1, y, Math.max(2, (barWidth - 14) * stat.fraction), 6, laser.color, 1)
        .setOrigin(0, 0.5)
        .setDepth(3);
    });
  }

  private highlight(): void {
    this.panels.forEach((panel, i) => {
      const laser = LASERS[i];
      if (i === this.selectedIndex) {
        panel.setStrokeStyle(3, laser.color);
        panel.setFillStyle(0x0f1e33, 0.95);
        this.tweens.add({ targets: panel, scale: 1.04, duration: 120, ease: "Cubic.easeOut" });
      } else {
        panel.setStrokeStyle(2, 0x2f4b6b);
        panel.setFillStyle(0x0b1626, 0.85);
        this.tweens.add({ targets: panel, scale: 1, duration: 120, ease: "Cubic.easeOut" });
      }
    });
  }

  private confirm(): void {
    const laser = LASERS[this.selectedIndex];
    this.scene.start("LevelSelect", { characterId: this.characterId, laserId: laser.id });
  }

  update(): void {
    const left = Phaser.Input.Keyboard.JustDown(this.cursors.left!) || Phaser.Input.Keyboard.JustDown(this.wasd.A);
    const right = Phaser.Input.Keyboard.JustDown(this.cursors.right!) || Phaser.Input.Keyboard.JustDown(this.wasd.D);
    if (left) {
      this.selectedIndex = (this.selectedIndex - 1 + LASERS.length) % LASERS.length;
      this.highlight();
    } else if (right) {
      this.selectedIndex = (this.selectedIndex + 1) % LASERS.length;
      this.highlight();
    }
  }
}
