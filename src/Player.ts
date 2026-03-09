import Phaser from "phaser";
import Bullet from "./Bullet";

export default class Player extends Phaser.Physics.Arcade.Sprite {
  // Movement Properties
  private moveSpeed: number = 200; // Pixels per second
  private afterburnerSpeedMultiplier: number = 1.5;
  private afterburnerDuration: number = 2000; // ms
  private afterburnerCooldown: number = 5000; // ms

  // State
  private currentSpeed: number;
  private afterburnerActive: boolean = false;
  private afterburnerTimer: number = 0;
  private afterburnerCooldownTimer: number = 0;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private wasd!: any;

  // Weapon Properties
  private fireRate: number = 0.5; // fires per second
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

    // Set physics properties
    this.setCollideWorldBounds(true);
    // Assuming sprite faces up by default, if it faces right, we would adjust rotation.
    // We will rotate it based on movement.

    // Input setup
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
      });
    }
  }

  update(_time: number, delta: number) {
    this.updateTimers(delta);
    this.handleInput();
    this.handleWeapon(delta);
  }

  private updateTimers(delta: number) {
    // Afterburner
    if (this.afterburnerActive) {
      this.afterburnerTimer -= delta;
      if (this.afterburnerTimer <= 0) {
        this.deactivateAfterburner();
      }
    }

    if (this.afterburnerCooldownTimer > 0) {
      this.afterburnerCooldownTimer -= delta;
    }

    // Weapon
    if (this.fireCooldown > 0) {
      this.fireCooldown -= delta;
    }
  }

  private handleInput() {
    if (!this.cursors || !this.wasd) return;

    let inputX = 0;
    let inputY = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) inputX = -1;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) inputX = 1;

    if (this.cursors.up.isDown || this.wasd.up.isDown) inputY = -1;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) inputY = 1;

    const movementInput = new Phaser.Math.Vector2(inputX, inputY).normalize();

    if (
      this.shiftKey.isDown &&
      !this.afterburnerActive &&
      this.afterburnerCooldownTimer <= 0
    ) {
      this.activateAfterburner();
    }

    // 유니티 원본 "회전 처리 - 수정된 회전 로직" (점진적 회전) 재현
    if (movementInput.lengthSq() > 0) {
      // Unity: Mathf.Atan2(movementInput.y, movementInput.x) * Mathf.Rad2Deg - 90f;
      const targetAngle = Math.atan2(movementInput.y, movementInput.x);

      // Phaser rotation에서 부드러운 회전(Lerp) 적용
      let currentAngle = this.rotation - Math.PI / 2;

      // 각도 차이 보정 (-PI ~ PI 범위로)
      let diff = targetAngle - currentAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      // 0.1f 속도(SmoothDamp와 유사한 임의의 Lerp 계수)로 회전
      currentAngle += diff * 0.1;

      this.rotation = currentAngle + Math.PI / 2;
    }

    // 유니티 원본 "전진 이동 (항상 전방으로 이동)" 재현
    // moveDirection = transform.up; rb.linearVelocity = moveDirection * currentSpeed;
    const angleRad = this.rotation - Math.PI / 2;
    const vx = Math.cos(angleRad) * this.currentSpeed;
    const vy = Math.sin(angleRad) * this.currentSpeed;
    this.setVelocity(vx, vy);
  }

  private handleWeapon(_delta: number) {
    if (this.fireCooldown <= 0) {
      this.fire();
      // fireRate is per second. 1 / fireRate = interval in seconds. * 1000 for ms.
      this.fireCooldown = (1 / this.fireRate) * 1000;
    }
  }

  private fire() {
    const bullet = this.bulletGroup.get(this.x, this.y) as Bullet;
    if (bullet) {
      // Pass rotation in degrees since Bullet uses setRotation, wait Bullet fire method takes degrees.
      bullet.fire(this.x, this.y, Phaser.Math.RadToDeg(this.rotation));
    }
  }

  private activateAfterburner() {
    this.afterburnerActive = true;
    this.afterburnerTimer = this.afterburnerDuration;
    this.currentSpeed = this.moveSpeed * this.afterburnerSpeedMultiplier;
    // VFX would be toggled here
  }

  private deactivateAfterburner() {
    this.afterburnerActive = false;
    this.currentSpeed = this.moveSpeed;
    this.afterburnerCooldownTimer = this.afterburnerCooldown;
    // VFX off
  }
}
