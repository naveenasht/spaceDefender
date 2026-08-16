import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOver");
  }

  create(data: { score: number }): void {
    this.cameras.main.setBackgroundColor(0x05070d);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, "GAME OVER", {
        fontFamily: "monospace",
        fontSize: "44px",
        color: "#ff5d5d",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.48, `SCORE: ${data.score ?? 0}`, {
        fontFamily: "monospace",
        fontSize: "24px",
        color: "#ffcf5c",
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.65, "PRESS SPACE OR CLICK TO RESTART", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#c9d6e3",
      })
      .setOrigin(0.5);

    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 650, yoyo: true, repeat: -1 });

    this.input.keyboard!.once("keydown-SPACE", () => this.scene.start("Game"));
    this.input.once("pointerdown", () => this.scene.start("Game"));
  }
}
