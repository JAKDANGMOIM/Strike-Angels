import Phaser from "phaser";
import "./style.css";
import Player from "./Player";
import Bullet from "./Bullet";

class Enemy extends Phaser.Physics.Arcade.Sprite {
  private speed: number = 80;
  private shootCooldown: number = 0;
  private shootInterval: number = 1800;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "enemy");
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  spawn(x: number, y: number, targetX: number, targetY: number) {
    this.enableBody(true, x, y, true, true);
    this.setActive(true);
    this.setVisible(true);

    const direction = new Phaser.Math.Vector2(targetX - x, targetY - y).normalize();
    this.setVelocity(direction.x * this.speed, direction.y * this.speed);
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    this.shootCooldown -= delta;

    if (this.active && this.shootCooldown <= 0) {
      const gameScene = this.scene as GameScene;
      this.fireAt(gameScene.player.x, gameScene.player.y);
      this.shootCooldown = this.shootInterval;
    }

    const padding = 40;
    if (
      this.x < -padding ||
      this.x > this.scene.scale.width + padding ||
      this.y < -padding ||
      this.y > this.scene.scale.height + padding
    ) {
      this.disableBody(true, true);
    }
  }

  private fireAt(targetX: number, targetY: number) {
    const gameScene = this.scene as GameScene;
    const bullet = gameScene.enemyBulletGroup.get(this.x, this.y) as EnemyBullet;
    if (!bullet) return;

    const angle = Phaser.Math.RadToDeg(
      Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY),
    );
    bullet.fire(this.x, this.y, angle);
  }
}

class EnemyBullet extends Phaser.Physics.Arcade.Sprite {
  private speed: number = 220;
  private lifeTime: number = 3500;
  private spawnTime: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "enemyBullet");
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  fire(x: number, y: number, angleDegrees: number) {
    this.enableBody(true, x, y, true, true);
    this.setActive(true);
    this.setVisible(true);
    this.setRotation(Phaser.Math.DegToRad(angleDegrees));

    const angleRad = this.rotation;
    this.setVelocity(
      Math.cos(angleRad) * this.speed,
      Math.sin(angleRad) * this.speed,
    );
    this.spawnTime = this.scene.time.now;
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (time > this.spawnTime + this.lifeTime) {
      this.disableBody(true, true);
    }
  }
}

class GameScene extends Phaser.Scene {
  public player!: Player;
  private bulletGroup!: Phaser.Physics.Arcade.Group;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  public enemyBulletGroup!: Phaser.Physics.Arcade.Group;
  private enemySpawnTimer: number = 0;
  private enemySpawnInterval: number = 1000;
  private healthBarFill!: Phaser.GameObjects.Rectangle;
  private gameOverShown: boolean = false;

  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("player", "assets/Player.png");
  }

  create() {
    const bulletGraphics = this.add.graphics();
    bulletGraphics.fillStyle(0xffff00, 1);
    bulletGraphics.fillCircle(4, 4, 4);
    bulletGraphics.generateTexture("bullet", 8, 8);
    bulletGraphics.destroy();

    const enemyGraphics = this.add.graphics();
    enemyGraphics.fillStyle(0xff0000, 1);
    enemyGraphics.fillRect(0, 0, 16, 16);
    enemyGraphics.generateTexture("enemy", 16, 16);
    enemyGraphics.destroy();

    const enemyBulletGraphics = this.add.graphics();
    enemyBulletGraphics.fillStyle(0xffa500, 1);
    enemyBulletGraphics.fillCircle(3, 3, 3);
    enemyBulletGraphics.generateTexture("enemyBullet", 6, 6);
    enemyBulletGraphics.destroy();

    this.bulletGroup = this.physics.add.group({
      classType: Bullet,
      maxSize: 200,
      runChildUpdate: true,
    });

    this.enemyGroup = this.physics.add.group({
      classType: Enemy,
      maxSize: 100,
      runChildUpdate: true,
    });

    this.enemyBulletGroup = this.physics.add.group({
      classType: EnemyBullet,
      maxSize: 200,
      runChildUpdate: true,
    });

    this.player = new Player(
      this,
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.bulletGroup,
    );

    this.createHealthUI();
    this.setupColliders();

    this.add.text(
      10,
      10,
      "Strike Angels\nDesktop: WASD/Arrows + Shift\nMobile: Left joystick + BOOST button",
      {
        fontSize: "16px",
        color: "#fff",
      },
    );
  }

  update(time: number, delta: number) {
    if (this.gameOverShown) return;

    this.player.update(time, delta);
    this.updateHealthUI();

    if (this.player.isDestroyed()) {
      this.handleGameOver();
      return;
    }

    this.enemySpawnTimer -= delta;
    if (this.enemySpawnTimer <= 0) {
      this.spawnEnemyFromRandomEdge();
      this.enemySpawnTimer = this.enemySpawnInterval;
    }
  }

  private spawnEnemyFromRandomEdge() {
    const enemy = this.enemyGroup.get(0, 0) as Enemy;
    if (!enemy) return;

    const { width, height } = this.scale;
    const side = Phaser.Math.Between(0, 3);

    let spawnX = 0;
    let spawnY = 0;

    if (side === 0) {
      spawnX = Phaser.Math.Between(0, width);
      spawnY = -20;
    } else if (side === 1) {
      spawnX = width + 20;
      spawnY = Phaser.Math.Between(0, height);
    } else if (side === 2) {
      spawnX = Phaser.Math.Between(0, width);
      spawnY = height + 20;
    } else {
      spawnX = -20;
      spawnY = Phaser.Math.Between(0, height);
    }

    enemy.spawn(spawnX, spawnY, this.player.x, this.player.y);
  }

  private createHealthUI() {
    this.add.text(10, 90, "체력", { fontSize: "16px", color: "#ffffff" });
    this.add.rectangle(60, 100, 210, 20, 0x333333).setOrigin(0, 0.5).setScrollFactor(0);
    this.healthBarFill = this.add
      .rectangle(60, 100, 210, 16, 0x00ff66)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
  }

  private updateHealthUI() {
    const healthPercent = this.player.getHealthPercent();
    this.healthBarFill.width = 210 * healthPercent;
    if (healthPercent > 0.5) this.healthBarFill.fillColor = 0x00ff66;
    else if (healthPercent > 0.2) this.healthBarFill.fillColor = 0xffcc00;
    else this.healthBarFill.fillColor = 0xff3300;
  }

  private setupColliders() {
    this.physics.add.overlap(this.bulletGroup, this.enemyGroup, (b, e) => {
      const bullet = b as Bullet;
      const enemy = e as Enemy;
      bullet.disableBody(true, true);
      enemy.disableBody(true, true);
    });

    this.physics.add.overlap(this.player, this.enemyGroup, (_p, e) => {
      const enemy = e as Enemy;
      enemy.disableBody(true, true);
      this.player.takeDamage(20);
    });

    this.physics.add.overlap(this.player, this.enemyBulletGroup, (_p, eb) => {
      const enemyBullet = eb as EnemyBullet;
      enemyBullet.disableBody(true, true);
      this.player.takeDamage(10);
    });
  }

  private handleGameOver() {
    this.gameOverShown = true;
    this.player.setVelocity(0, 0);

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.add
      .rectangle(centerX, centerY, 420, 220, 0x000000, 0.75)
      .setStrokeStyle(2, 0xffffff, 0.5);

    this.add
      .text(centerX, centerY - 45, "GAME OVER", {
        fontSize: "44px",
        color: "#ff4d4d",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 5, "다시 도전하시겠습니까?", {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const retryButton = this.add
      .text(centerX, centerY + 70, "다시 도전", {
        fontSize: "26px",
        color: "#000000",
        backgroundColor: "#ffd54f",
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    retryButton.on("pointerdown", () => {
      this.scene.restart();
    });
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: [GameScene],
};

new Phaser.Game(config);
