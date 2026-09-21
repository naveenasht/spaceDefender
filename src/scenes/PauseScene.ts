import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";

/**
 * Launched on top of GameScene, which is paused via scene.pause() — that
 * freezes its update loop and, with it, physics/tweens/timers for free.
 * This scene just renders the overlay and listens for the resume key.
 */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super("Pause");
  }

  create(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.42, "PAUSED", {
        fontFamily: "monospace",
        fontSize: "40px",
        color: "#7cf7ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const resume = () => {
      this.scene.resume("Game");
      this.scene.stop();
    };
    const toMenu = () => {
      this.scene.stop("Game");
      this.scene.stop();
      this.scene.start("Menu");
    };

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.54, "TAP OR PRESS P / ESC TO RESUME", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#c9d6e3",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", resume);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.6, "TAP OR PRESS M FOR MAIN MENU", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#6f88a3",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        toMenu();
      });

    this.input.keyboard!.addKey("P").on("down", resume);
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on("down", resume);
    this.input.keyboard!.addKey("M").on("down", toMenu);
  }
}
