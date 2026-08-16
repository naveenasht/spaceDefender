import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";

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
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.28, "SPACE DEFENDER", {
        fontFamily: "monospace",
        fontSize: "42px",
        color: "#7cf7ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT * 0.28 + 60, "player")
      .setScale(1.4)
      .setAngle(-90);

    const lines = [
      "MOVE:  WASD / Arrow Keys",
      "AIM:   Mouse Pointer",
      "FIRE:  Left Click / Space",
      "POWER-UP:  F",
      "",
      "Collect ammo, shields, bombs & random items.",
      "Shooter enemies fire back — watch your ammo!",
    ];

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.52, lines, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#c9d6e3",
        align: "center",
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.86, "PRESS SPACE OR CLICK TO START", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffcf5c",
      })
      .setOrigin(0.5);

    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 650, yoyo: true, repeat: -1 });

    this.input.keyboard!.once("keydown-SPACE", () => this.scene.start("Game"));
    this.input.once("pointerdown", () => this.scene.start("Game"));
  }
}
