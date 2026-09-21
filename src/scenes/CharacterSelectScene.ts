import Phaser from "phaser";
import { CHARACTERS, GAME_HEIGHT, GAME_WIDTH, PLAYER_START_LIVES, type CharacterDef } from "../config";
import { audio } from "../audio";
import { getCoins, isCharacterUnlocked, spendCoins, unlockCharacter } from "../persistence";

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
  private cardExtras: Phaser.GameObjects.GameObject[] = [];
  private coinsText!: Phaser.GameObjects.Text;
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
    this.cardExtras = [];
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

    this.add
      .text(16, 16, "← MENU", { fontFamily: "monospace", fontSize: "13px", color: "#9fb3c8" })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.scene.start("Menu");
      });

    this.add.image(GAME_WIDTH - 90, 24, "coinIcon").setScale(0.85);
    this.coinsText = this.add
      .text(GAME_WIDTH - 76, 24, `${getCoins()}`, {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#ffd54d",
      })
      .setOrigin(0, 0.5);

    this.buildCards();

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 34, "←/→ SELECT   ENTER OR CLICK TO CONFIRM/UNLOCK   BACKSPACE: BACK", {
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
    audio.uiMove();
    this.highlight();
  }

  private buildCards(): void {
    this.panels.forEach((panel) => panel.destroy());
    this.panels = [];
    this.cardExtras.forEach((obj) => obj.destroy());
    this.cardExtras = [];

    const totalWidth = CHARACTERS.length * CARD_WIDTH + (CHARACTERS.length - 1) * CARD_GAP;
    const startX = GAME_WIDTH / 2 - totalWidth / 2;

    CHARACTERS.forEach((character, i) => {
      const cx = startX + i * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;
      this.buildCard(character, i, cx);
    });
  }

  private buildCard(character: CharacterDef, index: number, cx: number): void {
    const cy = CARD_TOP + CARD_HEIGHT / 2;
    const locked = !isCharacterUnlocked(character.id, character.coinCost);

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

    const icon = this.add.image(cx, CARD_TOP + 55, character.texture).setScale(1.7).setAngle(-90).setDepth(2);
    this.cardExtras.push(icon);
    if (locked) {
      icon.setTint(0x4a5568).setAlpha(0.5);
      this.cardExtras.push(this.add.image(cx, CARD_TOP + 55, "lockIcon").setScale(1.3).setDepth(3));
    }

    this.cardExtras.push(
      this.add
        .text(cx, CARD_TOP + 108, character.name.toUpperCase(), {
          fontFamily: "monospace",
          fontSize: "16px",
          color: locked ? "#5a6b80" : Phaser.Display.Color.IntegerToColor(character.color).rgba,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(2)
    );

    this.cardExtras.push(
      this.add
        .text(cx, CARD_TOP + 132, character.tagline, {
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#9fb3c8",
          align: "center",
          wordWrap: { width: CARD_WIDTH - 24 },
        })
        .setOrigin(0.5, 0)
        .setDepth(2)
    );

    const statStartY = CARD_TOP + 190;
    const rowHeight = 30;
    const barWidth = 110;
    const barX = cx - CARD_WIDTH / 2 + 60;

    statsFor(character).forEach((stat, row) => {
      const y = statStartY + row * rowHeight;
      this.cardExtras.push(
        this.add
          .text(cx - CARD_WIDTH / 2 + 16, y, stat.label, {
            fontFamily: "monospace",
            fontSize: "11px",
            color: "#6f88a3",
          })
          .setOrigin(0, 0.5)
          .setDepth(2)
      );

      this.cardExtras.push(
        this.add
          .rectangle(barX, y, barWidth, 8, 0x081018, 1)
          .setOrigin(0, 0.5)
          .setStrokeStyle(1, 0x2f4b6b)
          .setDepth(2)
      );

      this.cardExtras.push(
        this.add
          .rectangle(barX + 1, y, Math.max(2, (barWidth - 2) * stat.fraction), 6, character.color, 1)
          .setOrigin(0, 0.5)
          .setDepth(3)
      );
    });

    if (character.livesDelta !== 0) {
      const sign = character.livesDelta > 0 ? "+" : "";
      this.cardExtras.push(
        this.add
          .text(cx, CARD_TOP + CARD_HEIGHT - 20, `${sign}${character.livesDelta} LIFE  (${PLAYER_START_LIVES + character.livesDelta} TOTAL)`, {
            fontFamily: "monospace",
            fontSize: "10px",
            color: character.livesDelta > 0 ? "#4dffa0" : "#ff5d5d",
          })
          .setOrigin(0.5)
          .setDepth(2)
      );
    }

    if (locked) {
      const canAfford = getCoins() >= character.coinCost;
      this.cardExtras.push(
        this.add
          .text(cx, CARD_TOP + CARD_HEIGHT + 22, `UNLOCK: ${character.coinCost} COINS`, {
            fontFamily: "monospace",
            fontSize: "12px",
            color: canAfford ? "#ffd54d" : "#6f88a3",
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setDepth(2)
      );
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

    if (isCharacterUnlocked(character.id, character.coinCost)) {
      audio.uiConfirm();
      this.scene.start("LaserSelect", { characterId: character.id });
      return;
    }

    if (spendCoins(character.coinCost)) {
      unlockCharacter(character.id);
      audio.purchase();
      this.coinsText.setText(`${getCoins()}`);
      this.buildCards();
      this.highlight();
    } else {
      audio.denied();
      this.cameras.main.shake(200, 0.006);
    }
  }
}
