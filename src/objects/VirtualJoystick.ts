import Phaser from "phaser";

/**
 * A drag-anywhere-in-the-zone thumbstick, fixed to the screen. Tracks a
 * single pointer by id across the whole input plugin (not just its own
 * zone) so the thumb keeps following a finger that's dragged outside the
 * base once the touch has started there.
 */
export class VirtualJoystick {
  dx = 0;
  dy = 0;

  private pointerId: number | null = null;
  private readonly scene: Phaser.Scene;
  private readonly originX: number;
  private readonly originY: number;
  private readonly radius: number;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly thumb: Phaser.GameObjects.Arc;
  private readonly zone: Phaser.GameObjects.Zone;
  private readonly onMove: (pointer: Phaser.Input.Pointer) => void;
  private readonly onUp: (pointer: Phaser.Input.Pointer) => void;

  constructor(scene: Phaser.Scene, originX: number, originY: number, radius = 50) {
    this.scene = scene;
    this.originX = originX;
    this.originY = originY;
    this.radius = radius;

    this.base = scene.add
      .circle(originX, originY, radius, 0x0b1626, 0.55)
      .setStrokeStyle(2, 0x2f4b6b, 0.9)
      .setScrollFactor(0)
      .setDepth(30);
    this.thumb = scene.add
      .circle(originX, originY, radius * 0.45, 0x7cf7ff, 0.55)
      .setScrollFactor(0)
      .setDepth(31);

    this.zone = scene.add
      .zone(originX, originY, radius * 2.6, radius * 2.6)
      .setScrollFactor(0)
      .setDepth(29)
      .setInteractive();

    this.zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.pointerId !== null) return;
      this.pointerId = pointer.id;
      this.updateFromPointer(pointer);
    });

    this.onMove = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.pointerId) this.updateFromPointer(pointer);
    };
    this.onUp = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.pointerId) this.reset();
    };
    scene.input.on("pointermove", this.onMove);
    scene.input.on("pointerup", this.onUp);
    scene.input.on("pointerupoutside", this.onUp);
  }

  get active(): boolean {
    return this.pointerId !== null;
  }

  get magnitude(): number {
    return Math.hypot(this.dx, this.dy);
  }

  get angle(): number {
    return Math.atan2(this.dy, this.dx);
  }

  private updateFromPointer(pointer: Phaser.Input.Pointer): void {
    let dx = pointer.x - this.originX;
    let dy = pointer.y - this.originY;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, this.radius);
    if (dist > 0) {
      dx = (dx / dist) * clamped;
      dy = (dy / dist) * clamped;
    }
    this.thumb.setPosition(this.originX + dx, this.originY + dy);
    this.dx = dx / this.radius;
    this.dy = dy / this.radius;
  }

  private reset(): void {
    this.pointerId = null;
    this.dx = 0;
    this.dy = 0;
    this.thumb.setPosition(this.originX, this.originY);
  }

  destroy(): void {
    this.scene.input.off("pointermove", this.onMove);
    this.scene.input.off("pointerup", this.onUp);
    this.scene.input.off("pointerupoutside", this.onUp);
    this.base.destroy();
    this.thumb.destroy();
    this.zone.destroy();
  }
}
