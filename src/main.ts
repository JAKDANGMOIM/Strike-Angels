import Phaser from "phaser";
import "./style.css";
import Player from "./Player";
import Bullet from "./Bullet";

type MobileControlKey = "up" | "down" | "left" | "right" | "boost";

class MobileControls {
  public readonly state: Record<MobileControlKey, boolean> = {
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
  };

  private root: HTMLDivElement;

  constructor() {
    this.root = document.createElement("div");
    this.root.className = "mobile-controls";

    const pad = document.createElement("div");
    pad.className = "mobile-pad";

    const boost = this.createButton("BOOST", "boost");
    boost.classList.add("boost");

    const up = this.createButton("▲", "up");
    up.classList.add("up");
    const down = this.createButton("▼", "down");
    down.classList.add("down");
    const left = this.createButton("◀", "left");
    left.classList.add("left");
    const right = this.createButton("▶", "right");
    right.classList.add("right");

    pad.append(up, down, left, right);
    this.root.append(pad, boost);
    document.body.appendChild(this.root);
  }

  private createButton(label: string, key: MobileControlKey): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mobile-btn";
    button.textContent = label;

    const press = (pressed: boolean) => {
      this.state[key] = pressed;
      button.classList.toggle("pressed", pressed);
    };

    button.addEventListener("touchstart", (event) => {
      event.preventDefault();
      press(true);
    });
    button.addEventListener("touchend", () => press(false));
    button.addEventListener("touchcancel", () => press(false));
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      press(true);
    });
    button.addEventListener("mouseup", () => press(false));
    button.addEventListener("mouseleave", () => press(false));

    return button;
  }
}

class GameScene extends Phaser.Scene {
  private player!: Player;
  private bulletGroup!: Phaser.Physics.Arcade.Group;

  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("player", "assets/Player.png");
  }

  create() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture("bullet", 8, 8);
    graphics.destroy();

    this.bulletGroup = this.physics.add.group({
      classType: Bullet,
      maxSize: 100,
      runChildUpdate: true,
    });

    this.player = new Player(
      this,
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.bulletGroup,
    );

    const mobileControls = new MobileControls();
    this.player.setMobileInputState(mobileControls.state);

    this.add.text(
      10,
      10,
      "Strike Angels - Web Version\nWASD/Arrows to Rotate\nShift or BOOST to Afterburn",
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
