import Phaser from "phaser";

export default class Bullet extends Phaser.Physics.Arcade.Sprite {
  private speed: number = 400; // Phaser physics speed (pixels/sec), adjusting from Unity's 10f
  private damage: number = 1;
  private lifeTime: number = 3000; // ms
  private spawnTime: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // We will just draw a simple rectangle for the bullet if no sprite is present,
    // or we can use a generated texture. Let's use a graphics generated texture.
    super(scene, x, y, "bullet");
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  fire(x: number, y: number, angleDegrees: number) {
    this.enableBody(true, x, y, true, true);
    this.setActive(true);
    this.setVisible(true);

    this.setRotation(Phaser.Math.DegToRad(angleDegrees));

    // Calculate velocity based on rotation
    const angleRad = this.rotation - Math.PI / 2; // Subtract 90 degrees because 0 degrees is facing up in our game (Unity behavior)
    const vx = Math.cos(angleRad) * this.speed;
    const vy = Math.sin(angleRad) * this.speed;

    this.setVelocity(vx, vy);
    this.spawnTime = this.scene.time.now;
  }

  setDamage(newDamage: number) {
    this.damage = newDamage;
  }

  getDamage(): number {
    return this.damage;
  }

  update(time: number, delta: number) {
    super.update(time, delta);

    if (time > this.spawnTime + this.lifeTime) {
      this.disableBody(true, true);
    }
  }
}
