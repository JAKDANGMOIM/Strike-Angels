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
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private shiftKey?: Phaser.Input.Keyboard.Key;
  private wasd?: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  // Mobile Input
  private readonly isTouchDevice: boolean;
  private touchDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private joystickBase?: Phaser.GameObjects.Arc;
  private joystickThumb?: Phaser.GameObjects.Arc;
  private boostButton?: Phaser.GameObjects.Arc;
  private joystickPointerId: number | null = null;

  // Weapon Properties
  private fireRate: number = 0.5; // fires per second
  private fireCooldown: number = 0;
  private bulletGroup: Phaser.Physics.Arcade.Group;

  // Health
  private readonly maxHealth: number = 100;
  private health: number = 100;
  private smokeTimer: number = 0;
  private smokeInterval: number = 120;

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
    this.isTouchDevice = scene.sys.game.device.input.touch;

    // Set physics properties
    this.setCollideWorldBounds(true);

    // Scale down the high-res sprite (preserving aspect ratio)
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
      }) as {
        up: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
      };
    }

    if (this.isTouchDevice) {
      this.createMobileControls();
    }
  }

  update(_time: number, delta: number) {
    this.updateTimers(delta);
    this.handleInput();
    this.handleWeapon(delta);
    this.updateSmoke(delta);
  }

  takeDamage(amount: number) {
    this.health = Phaser.Math.Clamp(this.health - amount, 0, this.maxHealth);
  }

  getHealthPercent(): number {
    return this.health / this.maxHealth;
  }

  isDestroyed(): boolean {
    return this.health <= 0;
  }

  private updateSmoke(delta: number) {
    if (this.health > this.maxHealth * 0.5 || this.health <= 0) {
      return;
    }

    this.smokeTimer -= delta;
    if (this.smokeTimer > 0) {
      return;
    }

    this.smokeTimer = this.smokeInterval;
    const offset = new Phaser.Math.Vector2(0, 20).rotate(this.rotation);
    const smoke = this.scene.add.circle(
      this.x + offset.x,
      this.y + offset.y,
      Phaser.Math.Between(4, 8),
      0x777777,
      0.7,
    );

    this.scene.tweens.add({
      targets: smoke,
      x: smoke.x + Phaser.Math.Between(-10, 10),
      y: smoke.y + Phaser.Math.Between(-25, -10),
      alpha: 0,
      scale: 1.8,
      duration: 500,
      onComplete: () => smoke.destroy(),
    });
  }

  private createMobileControls() {
    const baseX = 110;
    const baseY = this.scene.scale.height - 110;

    this.joystickBase = this.scene.add
      .circle(baseX, baseY, 62, 0x222222, 0.35)
      .setScrollFactor(0)
      .setDepth(1000)
      .setStrokeStyle(2, 0xffffff, 0.25);

    this.joystickThumb = this.scene.add
      .circle(baseX, baseY, 34, 0xffffff, 0.45)
      .setScrollFactor(0)
      .setDepth(1001);

    this.boostButton = this.scene.add
      .circle(this.scene.scale.width - 95, this.scene.scale.height - 95, 52, 0xff8c00, 0.45)
      .setScrollFactor(0)
      .setDepth(1000)
      .setStrokeStyle(2, 0xffffff, 0.35);

    this.boostButton.setInteractive({ useHandCursor: false });

    this.scene.scale.on("resize", this.handleResize, this);

    this.scene.input.on("pointerdown", this.handlePointerDown, this);
    this.scene.input.on("pointermove", this.handlePointerMove, this);
    this.scene.input.on("pointerup", this.handlePointerUp, this);
    this.scene.input.on("pointerupoutside", this.handlePointerUp, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    if (!this.joystickBase || !this.joystickThumb || !this.boostButton) return;

    this.joystickBase.setPosition(110, gameSize.height - 110);
    this.joystickThumb.setPosition(110, gameSize.height - 110);
    this.boostButton.setPosition(gameSize.width - 95, gameSize.height - 95);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.joystickBase || !this.joystickThumb || !this.boostButton) return;

    if (pointer.x < this.scene.scale.width * 0.5 && this.joystickPointerId === null) {
      this.joystickPointerId = pointer.id;
      this.updateJoystick(pointer);
      return;
    }

    if (this.boostButton.getBounds().contains(pointer.x, pointer.y)) {
      this.tryActivateAfterburner();
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.joystickPointerId) return;
    this.updateJoystick(pointer);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer) {
    if (!this.joystickBase || !this.joystickThumb) return;

    if (pointer.id === this.joystickPointerId) {
      this.joystickPointerId = null;
      this.touchDirection.set(0, 0);
      this.joystickThumb.setPosition(this.joystickBase.x, this.joystickBase.y);
    }
  }

  private updateJoystick(pointer: Phaser.Input.Pointer) {
    if (!this.joystickBase || !this.joystickThumb) return;

    const dx = pointer.x - this.joystickBase.x;
    const dy = pointer.y - this.joystickBase.y;
    const vector = new Phaser.Math.Vector2(dx, dy);

    const maxDistance = 50;
    if (vector.length() > maxDistance) {
      vector.setLength(maxDistance);
    }

    this.joystickThumb.setPosition(
      this.joystickBase.x + vector.x,
      this.joystickBase.y + vector.y,
    );

    this.touchDirection = vector.normalize();
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
    let inputX = 0;
    let inputY = 0;

    if (this.cursors && this.wasd) {
      if (this.cursors.left.isDown || this.wasd.left.isDown) inputX = -1;
      else if (this.cursors.right.isDown || this.wasd.right.isDown) inputX = 1;

      if (this.cursors.up.isDown || this.wasd.up.isDown) inputY = -1;
      else if (this.cursors.down.isDown || this.wasd.down.isDown) inputY = 1;

      if (this.shiftKey?.isDown) {
        this.tryActivateAfterburner();
      }
    }

    if (this.touchDirection.lengthSq() > 0) {
      inputX = this.touchDirection.x;
      inputY = this.touchDirection.y;
    }

    const movementInput = new Phaser.Math.Vector2(inputX, inputY).normalize();

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
    const baseAngle = Phaser.Math.RadToDeg(this.rotation);
    const spreadAngles = [-12, 0, 12];

    for (const spread of spreadAngles) {
      const bullet = this.bulletGroup.get(this.x, this.y) as Bullet;
      if (bullet) {
        bullet.fire(this.x, this.y, baseAngle + spread);
      }
    }
  }

  private tryActivateAfterburner() {
    if (!this.afterburnerActive && this.afterburnerCooldownTimer <= 0) {
      this.activateAfterburner();
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
