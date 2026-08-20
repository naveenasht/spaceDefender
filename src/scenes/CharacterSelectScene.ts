import Phaser from "phaser";
import { CHARACTERS, GAME_HEIGHT, GAME_WIDTH, PLAYER_START_LIVES, type CharacterDef } from "../config";

const CARD_WIDTH = 200;
const CARD_HEIGHT = 340;
const CARD_GAP = 30;
const CARD_TOP = 150;

interface StatRow {
  label: string;
  fraction: number;
}

function normalize(value: number, min: number, max: number): number {
  return Phaser.Math.Clamp((value - min) / (max - min), 0, 1);
}

function statsFor(character: CharacterDef): StatRow[] {
  return [
    { label: "SPEED", fraction: normalize(character.speedMult, 0.75, 1.3) },
    { label: "RATE", fraction: 1 - normalize(character.fireCooldownMult, 0.65, 1.35) },
    { label: "HULL", fraction: normalize(character.livesDelta, -1, 1) },
    { label: "AMMO", fraction: normalize(character.ammoMult, 0.75, 1.25) },
  ];
}

export class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private panels: Phaser.GameObjects.Rectangle[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { A: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private keyEnter!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyBackspace!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("CharacterSelect");
  }

  create(): void {
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
      .text(GAME_WIDTH / 2, 60, "SELECT YOUR SHIP", {
        fontFamily: "monospace",
        fontSize: "32px",
        color: "#7cf7ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const totalWidth = CHARACTERS.length * CARD_WIDTH + (CHARACTERS.length - 1) * CARD_GAP;
    const startX = GAME_WIDTH / 2 - totalWidth / 2;

    CHARACTERS.forEach((character, i) => {
      const cx = startX + i * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;
      this.buildCard(character, i, cx);
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
    this.keyBackspace.on("down", () => this.scene.start("Menu"));
    this.cursors.left!.on("down", () => this.moveSelection(-1));
    this.cursors.right!.on("down", () => this.moveSelection(1));
    this.wasd.A.on("down", () => this.moveSelection(-1));
    this.wasd.D.on("down", () => this.moveSelection(1));

    this.highlight();
  }

  private moveSelection(delta: number): void {
    this.selectedIndex = (this.selectedIndex + delta + CHARACTERS.length) % CHARACTERS.length;
    this.highlight();
  }

  private buildCard(character: CharacterDef, index: number, cx: number): void {
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

    this.add
      .image(cx, CARD_TOP + 55, character.texture)
      .setScale(1.7)
      .setAngle(-90)
      .setDepth(2);

    this.add
      .text(cx, CARD_TOP + 108, character.name.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "16px",
        color: Phaser.Display.Color.IntegerToColor(character.color).rgba,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(cx, CARD_TOP + 132, character.tagline, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#9fb3c8",
        align: "center",
        wordWrap: { width: CARD_WIDTH - 24 },
      })
      .setOrigin(0.5, 0)
      .setDepth(2);

    const statStartY = CARD_TOP + 190;
    const rowHeight = 30;
    const barWidth = 110;
    const barX = cx - CARD_WIDTH / 2 + 60;

    statsFor(character).forEach((stat, row) => {
      const y = statStartY + row * rowHeight;
      this.add
        .text(cx - CARD_WIDTH / 2 + 16, y, stat.label, {
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#6f88a3",
        })
        .setOrigin(0, 0.5)
        .setDepth(2);

      this.add
        .rectangle(barX, y, barWidth, 8, 0x081018, 1)
        .setOrigin(0, 0.5)
        .setStrokeStyle(1, 0x2f4b6b)
        .setDepth(2);

      this.add
        .rectangle(barX + 1, y, Math.max(2, (barWidth - 2) * stat.fraction), 6, character.color, 1)
        .setOrigin(0, 0.5)
        .setDepth(3);
    });

    if (character.livesDelta !== 0) {
      const sign = character.livesDelta > 0 ? "+" : "";
      this.add
        .text(cx, CARD_TOP + CARD_HEIGHT - 20, `${sign}${character.livesDelta} LIFE  (${PLAYER_START_LIVES + character.livesDelta} TOTAL)`, {
          fontFamily: "monospace",
          fontSize: "10px",
          color: character.livesDelta > 0 ? "#4dffa0" : "#ff5d5d",
        })
        .setOrigin(0.5)
        .setDepth(2);
    }
  }

  private highlight(): void {
    this.panels.forEach((panel, i) => {
      const character = CHARACTERS[i];
      if (i === this.selectedIndex) {
        panel.setStrokeStyle(3, character.color);
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
    const character = CHARACTERS[this.selectedIndex];
    this.scene.start("LaserSelect", { characterId: character.id });
  }
}
