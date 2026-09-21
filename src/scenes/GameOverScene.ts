import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";
import { getBestForLevel } from "../persistence";

interface GameOverData {
  score?: number;
  characterId?: string;
  laserId?: string;
  levelId?: string;
  isNewOverallBest?: boolean;
  isNewLevelBest?: boolean;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOver");
  }

  create(data: GameOverData): void {
    this.cameras.main.setBackgroundColor(0x05070d);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.3, "GAME OVER", {
        fontFamily: "monospace",
        fontSize: "44px",
        color: "#ff5d5d",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.42, `SCORE: ${data.score ?? 0}`, {
        fontFamily: "monospace",
        fontSize: "24px",
        color: "#ffcf5c",
      })
      .setOrigin(0.5);

    if (data.isNewLevelBest) {
      const badge = this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT * 0.51,
          data.isNewOverallBest ? "NEW OVERALL BEST!" : "NEW SECTOR BEST!",
          { fontFamily: "monospace", fontSize: "16px", color: "#4dffa0", fontStyle: "bold" }
        )
        .setOrigin(0.5);
      this.tweens.add({ targets: badge, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    } else if (data.levelId) {
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.51, `SECTOR BEST: ${getBestForLevel(data.levelId)}`, {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#9fb3c8",
        })
        .setOrigin(0.5);
    }

    const prompt = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.66, "TAP, CLICK, OR PRESS SPACE TO RETRY", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#c9d6e3",
      })
      .setOrigin(0.5);

    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 650, yoyo: true, repeat: -1 });

    const toMenu = () => this.scene.start("Menu");

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.76, "TAP OR PRESS M FOR MAIN MENU", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#6f88a3",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        toMenu();
      });

    const retry = () =>
      this.scene.start("Game", {
        characterId: data.characterId,
        laserId: data.laserId,
        levelId: data.levelId,
      });

    this.input.keyboard!.once("keydown-SPACE", retry);
    this.input.once("pointerdown", retry);
    this.input.keyboard!.once("keydown-M", toMenu);
  }
}
