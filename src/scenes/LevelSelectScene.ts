import Phaser from "phaser";
import { CHARACTERS, GAME_HEIGHT, GAME_WIDTH, LEVELS, type LevelDef } from "../config";

const CARD_WIDTH = 200;
const CARD_HEIGHT = 300;
const CARD_GAP = 30;
const CARD_TOP = 160;

const DIFFICULTY_COLOR: Record<number, number> = {
  1: 0x4dffa0,
  2: 0xffcf5c,
  3: 0xff5d5d,
};

interface LevelSelectData {
  characterId?: string;
}

export class LevelSelectScene extends Phaser.Scene {
  private characterId!: string;
  private selectedIndex = 0;
  private panels: Phaser.GameObjects.Rectangle[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { A: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private keyEnter!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyBackspace!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("LevelSelect");
  }

  create(data: LevelSelectData): void {
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
      .text(GAME_WIDTH / 2, 60, "SELECT LEVEL", {
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

    const totalWidth = LEVELS.length * CARD_WIDTH + (LEVELS.length - 1) * CARD_GAP;
    const startX = GAME_WIDTH / 2 - totalWidth / 2;

    LEVELS.forEach((level, i) => {
      const cx = startX + i * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;
      this.buildCard(level, i, cx);
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

  private buildCard(level: LevelDef, index: number, cx: number): void {
    const cy = CARD_TOP + CARD_HEIGHT / 2;
    const accent = DIFFICULTY_COLOR[level.difficulty];

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

    this.add
      .text(cx, CARD_TOP + 34, level.name.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#e6f2fb",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: CARD_WIDTH - 24 },
      })
      .setOrigin(0.5, 0)
      .setDepth(2);

    this.add
      .text(cx, CARD_TOP + 70, level.tagline, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#9fb3c8",
        align: "center",
        wordWrap: { width: CARD_WIDTH - 24 },
      })
      .setOrigin(0.5, 0)
      .setDepth(2);

    const dotY = CARD_TOP + 115;
    const dotGap = 18;
    const dotsStartX = cx - dotGap;
    for (let d = 0; d < 3; d++) {
      this.add
        .circle(dotsStartX + d * dotGap, dotY, 6, d < level.difficulty ? accent : 0x1c2c42, 1)
        .setDepth(2);
    }
    this.add
      .text(cx, dotY + 20, "DIFFICULTY", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#6f88a3",
      })
      .setOrigin(0.5)
      .setDepth(2);

    const infoY = CARD_TOP + 165;
    const rows = [
      ["ENEMY SPAWN", `${(level.enemySpawnMs / 1000).toFixed(1)}s`],
      ["SHOOTER MIX", `${Math.round(level.weights.shooter * 100)}%`],
      ["ELITE MIX", `${Math.round(level.weights.extra * 100)}%`],
    ];
    rows.forEach(([label, value], row) => {
      const y = infoY + row * 22;
      this.add
        .text(cx - CARD_WIDTH / 2 + 16, y, label, {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#6f88a3",
        })
        .setOrigin(0, 0.5)
        .setDepth(2);
      this.add
        .text(cx + CARD_WIDTH / 2 - 16, y, value, {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#c9d6e3",
        })
        .setOrigin(1, 0.5)
        .setDepth(2);
    });
  }

  private highlight(): void {
    this.panels.forEach((panel, i) => {
      const level = LEVELS[i];
      const accent = DIFFICULTY_COLOR[level.difficulty];
      if (i === this.selectedIndex) {
        panel.setStrokeStyle(3, accent);
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
    const level = LEVELS[this.selectedIndex];
    this.scene.start("Game", { characterId: this.characterId, levelId: level.id });
  }

  update(): void {
    const left = Phaser.Input.Keyboard.JustDown(this.cursors.left!) || Phaser.Input.Keyboard.JustDown(this.wasd.A);
    const right = Phaser.Input.Keyboard.JustDown(this.cursors.right!) || Phaser.Input.Keyboard.JustDown(this.wasd.D);
    if (left) {
      this.selectedIndex = (this.selectedIndex - 1 + LEVELS.length) % LEVELS.length;
      this.highlight();
    } else if (right) {
      this.selectedIndex = (this.selectedIndex + 1) % LEVELS.length;
      this.highlight();
    }
  }
}
