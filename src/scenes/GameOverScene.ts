import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";

interface GameOverData {
  score?: number;
  characterId?: string;
  levelId?: string;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOver");
  }

  create(data: GameOverData): void {
    this.cameras.main.setBackgroundColor(0x05070d);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.32, "GAME OVER", {
        fontFamily: "monospace",
        fontSize: "44px",
        color: "#ff5d5d",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.45, `SCORE: ${data.score ?? 0}`, {
        fontFamily: "monospace",
        fontSize: "24px",
        color: "#ffcf5c",
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.62, "PRESS SPACE OR CLICK TO RETRY", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#c9d6e3",
      })
      .setOrigin(0.5);

    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 650, yoyo: true, repeat: -1 });

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.72, "PRESS M FOR MAIN MENU", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#6f88a3",
      })
      .setOrigin(0.5);

    const retry = () =>
      this.scene.start("Game", { characterId: data.characterId, levelId: data.levelId });

    this.input.keyboard!.once("keydown-SPACE", retry);
    this.input.once("pointerdown", retry);
    this.input.keyboard!.once("keydown-M", () => this.scene.start("Menu"));
  }
}
