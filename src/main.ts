import Phaser from "phaser";
import "./style.css";
import Player from "./Player";
import Bullet from "./Bullet";

class Enemy extends Phaser.Physics.Arcade.Sprite {
  private speed: number = 80;

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
}

class GameScene extends Phaser.Scene {
  private player!: Player;
  private bulletGroup!: Phaser.Physics.Arcade.Group;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private enemySpawnTimer: number = 0;
  private enemySpawnInterval: number = 1000;

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

    this.player = new Player(
      this,
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.bulletGroup,
    );

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
    this.player.update(time, delta);

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
