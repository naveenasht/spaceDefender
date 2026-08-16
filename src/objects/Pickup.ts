import Phaser from "phaser";

export type PickupKind = "ammo" | "bomb" | "random" | "shield";

const TEXTURE_BY_KIND: Record<PickupKind, string> = {
  ammo: "ammoPickup",
  bomb: "bombPickup",
  random: "randomPickup",
  shield: "shieldPickup",
};

export class Pickup extends Phaser.Physics.Arcade.Sprite {
  kind: PickupKind;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: PickupKind) {
    super(scene, x, y, TEXTURE_BY_KIND[kind]);
    this.kind = kind;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.9, this.height * 0.9);

    if (kind === "bomb" || kind === "random") {
      scene.tweens.add({
        targets: this,
        angle: 360,
        duration: 2200,
        repeat: -1,
      });
    }
  }

  /**
   * Arcade Group#add() resets a member's velocity to the group defaults,
   * so velocity must be (re)applied after the pickup is added to its group.
   */
  launch(): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocityY(70);
  }
}
