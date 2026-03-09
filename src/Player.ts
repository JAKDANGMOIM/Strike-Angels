import Phaser from "phaser";
import Bullet from "./Bullet";

type MobileInputState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  boost: boolean;
};

export default class Player extends Phaser.Physics.Arcade.Sprite {
  private moveSpeed: number = 200;
  private afterburnerSpeedMultiplier: number = 1.5;
  private afterburnerDuration: number = 2000;
  private afterburnerCooldown: number = 5000;

  private currentSpeed: number;
  private afterburnerActive: boolean = false;
  private afterburnerTimer: number = 0;
  private afterburnerCooldownTimer: number = 0;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private shiftKey?: Phaser.Input.Keyboard.Key;
  private wasd?: Record<string, Phaser.Input.Keyboard.Key>;
  private mobileInputState?: MobileInputState;

  private fireRate: number = 0.5;
  private fireCooldown: number = 0;
  private bulletGroup: Phaser.Physics.Arcade.Group;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    bulletGroup: Phaser.Physics.Arcade.Group,
  ) {
    super(scene, x, y, "player");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.bulletGroup = bulletGroup;
    this.currentSpeed = this.moveSpeed;

    this.setCollideWorldBounds(true);
    this.displayWidth = 48;
    this.scaleY = this.scaleX;

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.shiftKey = scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.SHIFT,
      );
      this.wasd = scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      }) as Record<string, Phaser.Input.Keyboard.Key>;
    }
  }

  setMobileInputState(state: MobileInputState) {
    this.mobileInputState = state;
  }

  update(_time: number, delta: number) {
    this.updateTimers(delta);
    this.handleInput();
    this.handleWeapon(delta);
  }

  private updateTimers(delta: number) {
    if (this.afterburnerActive) {
      this.afterburnerTimer -= delta;
      if (this.afterburnerTimer <= 0) {
        this.deactivateAfterburner();
      }
    }

    if (this.afterburnerCooldownTimer > 0) {
      this.afterburnerCooldownTimer -= delta;
    }

    if (this.fireCooldown > 0) {
      this.fireCooldown -= delta;
    }
  }

  private handleInput() {
    const keyboardLeft =
      (this.cursors?.left.isDown ?? false) || (this.wasd?.left?.isDown ?? false);
    const keyboardRight =
      (this.cursors?.right.isDown ?? false) ||
      (this.wasd?.right?.isDown ?? false);
    const keyboardUp =
      (this.cursors?.up.isDown ?? false) || (this.wasd?.up?.isDown ?? false);
    const keyboardDown =
      (this.cursors?.down.isDown ?? false) || (this.wasd?.down?.isDown ?? false);

    const touchLeft = this.mobileInputState?.left ?? false;
    const touchRight = this.mobileInputState?.right ?? false;
    const touchUp = this.mobileInputState?.up ?? false;
    const touchDown = this.mobileInputState?.down ?? false;

    let inputX = 0;
    let inputY = 0;

    if (keyboardLeft || touchLeft) inputX = -1;
    else if (keyboardRight || touchRight) inputX = 1;

    if (keyboardUp || touchUp) inputY = -1;
    else if (keyboardDown || touchDown) inputY = 1;

    const movementInput = new Phaser.Math.Vector2(inputX, inputY).normalize();

    const boostPressed =
      (this.shiftKey?.isDown ?? false) || (this.mobileInputState?.boost ?? false);

    if (boostPressed && !this.afterburnerActive && this.afterburnerCooldownTimer <= 0) {
      this.activateAfterburner();
    }

    if (movementInput.lengthSq() > 0) {
      const targetAngle = Math.atan2(movementInput.y, movementInput.x);
      let currentAngle = this.rotation - Math.PI / 2;

      let diff = targetAngle - currentAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      currentAngle += diff * 0.1;
      this.rotation = currentAngle + Math.PI / 2;
    }

    const angleRad = this.rotation - Math.PI / 2;
    const vx = Math.cos(angleRad) * this.currentSpeed;
    const vy = Math.sin(angleRad) * this.currentSpeed;
    this.setVelocity(vx, vy);
  }

  private handleWeapon(_delta: number) {
    if (this.fireCooldown <= 0) {
      this.fire();
      this.fireCooldown = (1 / this.fireRate) * 1000;
    }
  }

  private fire() {
    const bullet = this.bulletGroup.get(this.x, this.y) as Bullet;
    if (bullet) {
      bullet.fire(this.x, this.y, Phaser.Math.RadToDeg(this.rotation));
    }
  }

  private activateAfterburner() {
    this.afterburnerActive = true;
    this.afterburnerTimer = this.afterburnerDuration;
    this.currentSpeed = this.moveSpeed * this.afterburnerSpeedMultiplier;
  }

  private deactivateAfterburner() {
    this.afterburnerActive = false;
    this.currentSpeed = this.moveSpeed;
    this.afterburnerCooldownTimer = this.afterburnerCooldown;
  }
}
