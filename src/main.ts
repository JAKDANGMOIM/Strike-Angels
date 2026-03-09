import Phaser from "phaser";
import "./style.css";
import Player from "./Player";
import Bullet from "./Bullet";

class GameScene extends Phaser.Scene {
  private player!: Player;
  private bulletGroup!: Phaser.Physics.Arcade.Group;

  constructor() {
    super("GameScene");
  }

  preload() {
    // Load assets here
    this.load.image("player", "assets/Player.png");
  }

  create() {
    // Generate a simple bullet texture if no sprite is present for bullet
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture("bullet", 8, 8);
    graphics.destroy();

    // Object pools
    this.bulletGroup = this.physics.add.group({
      classType: Bullet,
      maxSize: 100,
      runChildUpdate: true,
    });

    // Initialize Player
    // Start in center of screen
    this.player = new Player(
      this,
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.bulletGroup,
    );

    // Add UI for web version demo
    this.add.text(
      10,
      10,
      "Strike Angels - Web Version\nWASD/Arrows to Rotate\nShift to Afterburn",
      {
        fontSize: "16px",
        color: "#fff",
      },
    );
  }

  update(time: number, delta: number) {
    this.player.update(time, delta);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
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
