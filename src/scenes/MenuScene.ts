import Phaser from "phaser";
import { CHARACTERS, GAME_HEIGHT, GAME_WIDTH } from "../config";
import { audio } from "../audio";
import { getCoins, getLastLoadout } from "../persistence";

interface ButtonColors {
  fill: number;
  stroke: number;
  text: string;
}

const PRIMARY_COLORS: ButtonColors = { fill: 0x0f3a45, stroke: 0x7cf7ff, text: "#7cf7ff" };
const SECONDARY_COLORS: ButtonColors = { fill: 0x0b1626, stroke: 0x2f4b6b, text: "#c9d6e3" };

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x05070d);

    for (let i = 0; i < 60; i++) {
      this.add
        .image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT), "star")
        .setAlpha(Phaser.Math.FloatBetween(0.3, 1))
        .setScale(Phaser.Math.FloatBetween(0.5, 1.6));
    }

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.19, "SPACE DEFENDER", {
        fontFamily: "monospace",
        fontSize: "40px",
        color: "#7cf7ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT * 0.19 + 48, "player")
      .setScale(1.2)
      .setAngle(-90);

    const lines = [
      "MOVE:  WASD / Arrow Keys",
      "AIM:   Mouse Pointer",
      "FIRE:  Left Click / Space",
      "POWER-UP:  F     PAUSE:  P",
      "",
      "Collect ammo, shields, bombs & random items.",
      "Survive the sector timer to clear it — watch your ammo!",
    ];

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.46, lines, {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#c9d6e3",
        align: "center",
        lineSpacing: 7,
      })
      .setOrigin(0.5);

    this.add.image(28, 28, "coinIcon").setScale(1.1);
    this.add
      .text(48, 28, `${getCoins()}`, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffd54d",
      })
      .setOrigin(0, 0.5);

    const muteButton = this.add
      .image(GAME_WIDTH - 28, 28, audio.isMuted() ? "speakerOff" : "speakerOn")
      .setInteractive({ useHandCursor: true })
      .setScale(1.1);
    muteButton.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      const muted = audio.toggleMuted();
      muteButton.setTexture(muted ? "speakerOff" : "speakerOn");
    });

    const enterAudio = () => {
      audio.resume();
      audio.startMusic();
      audio.uiConfirm();
    };

    const play = () => {
      enterAudio();
      const lastLoadout = getLastLoadout();
      if (lastLoadout) {
        this.scene.start("LevelSelect", lastLoadout);
      } else {
        this.scene.start("CharacterSelect");
      }
    };

    const openCharacters = () => {
      enterAudio();
      this.scene.start("CharacterSelect");
    };

    const openLasers = () => {
      enterAudio();
      const characterId = getLastLoadout()?.characterId ?? CHARACTERS[0].id;
      this.scene.start("LaserSelect", { characterId });
    };

    this.buildButton(GAME_WIDTH / 2, GAME_HEIGHT * 0.73, 220, 54, "PLAY", PRIMARY_COLORS, 18, play);

    const secondaryGap = 16;
    const secondaryWidth = 170;
    const secondaryY = GAME_HEIGHT * 0.73 + 27 + 14 + 20;
    const secondaryTotalWidth = secondaryWidth * 2 + secondaryGap;
    const secondaryStartX = GAME_WIDTH / 2 - secondaryTotalWidth / 2;

    this.buildButton(
      secondaryStartX + secondaryWidth / 2,
      secondaryY,
      secondaryWidth,
      40,
      "CHARACTERS",
      SECONDARY_COLORS,
      13,
      openCharacters
    );
    this.buildButton(
      secondaryStartX + secondaryWidth + secondaryGap + secondaryWidth / 2,
      secondaryY,
      secondaryWidth,
      40,
      "LASERS",
      SECONDARY_COLORS,
      13,
      openLasers
    );

    this.input.keyboard!.once("keydown-SPACE", play);
  }

  private buildButton(
    cx: number,
    cy: number,
    width: number,
    height: number,
    label: string,
    colors: ButtonColors,
    fontSize: number,
    onClick: () => void
  ): void {
    const rect = this.add
      .rectangle(cx, cy, width, height, colors.fill, 0.9)
      .setStrokeStyle(2, colors.stroke)
      .setInteractive({ useHandCursor: true })
      .setDepth(1);

    const text = this.add
      .text(cx, cy, label, {
        fontFamily: "monospace",
        fontSize: `${fontSize}px`,
        color: colors.text,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(2);

    rect.on("pointerover", () => {
      this.tweens.add({ targets: [rect, text], scale: 1.05, duration: 100, ease: "Cubic.easeOut" });
    });
    rect.on("pointerout", () => {
      this.tweens.add({ targets: [rect, text], scale: 1, duration: 100, ease: "Cubic.easeOut" });
    });
    rect.on(
      "pointerdown",
      (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        onClick();
      }
    );
  }
}
