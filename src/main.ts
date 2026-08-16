import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./config";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { CharacterSelectScene } from "./scenes/CharacterSelectScene";
import { LevelSelectScene } from "./scenes/LevelSelectScene";
import { GameScene } from "./scenes/GameScene";
import { GameOverScene } from "./scenes/GameOverScene";

new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "app",
  backgroundColor: "#05070d",
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, CharacterSelectScene, LevelSelectScene, GameScene, GameOverScene],
});
