import Phaser from "phaser";
import "./style.css";
import Player from "./Player";
import Bullet from "./Bullet";

class Enemy extends Phaser.Physics.Arcade.Sprite {
  protected speed = 110;
  protected hp = 2;
  private shootCooldown = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "enemy");
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  spawn(x: number, y: number) {
    const game = this.scene as GameScene;
    this.enableBody(true, x, y, true, true);
    this.setActive(true);
    this.setVisible(true);
    this.hp = game.getEnemyHp();
    const interval = game.getEnemyShootInterval();
    this.shootCooldown = Phaser.Math.Between(350, interval);
  }

  takeHit(damage: number): boolean {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.disableBody(true, true);
      return true;
    }
    return false;
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    const game = this.scene as GameScene;
    if (!this.active || game.isGameOver()) return;

    this.setVelocity(0, this.speed * game.getEnemySpeedMultiplier() + game.getStage() * 5);

    this.shootCooldown -= delta;
    if (this.shootCooldown <= 0) {
      this.fireAt(game.player.x, game.player.y);
      this.shootCooldown = game.getEnemyShootInterval();
    }

    if (this.y > this.scene.scale.height + 40) {
      this.disableBody(true, true);
    }
  }

  protected fireAt(targetX: number, targetY: number) {
    const gameScene = this.scene as GameScene;
    const bullet = gameScene.enemyBulletGroup.get(this.x, this.y) as EnemyBullet;
    if (!bullet) return;

    const angle = Phaser.Math.RadToDeg(
      Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY),
    );
    bullet.fire(this.x, this.y, angle, 230);
  }
}

class Boss extends Enemy {
  private readonly bossId: number;

  constructor(scene: Phaser.Scene, x: number, y: number, bossId: number) {
    super(scene, x, y);
    this.bossId = bossId;
    this.setTexture("boss");
    this.speed = 70;
  }

  spawn(x: number, y: number) {
    super.spawn(x, y);
    this.hp = 55;
    this.setScale(1.1);
    this.setTint(Phaser.Display.Color.GetColor(180 + this.bossId * 20, 120, 255));
  }

  getBossId() {
    return this.bossId;
  }

  protected fireAt(targetX: number, targetY: number) {
    const gameScene = this.scene as GameScene;
    for (const spread of [-20, -8, 8, 20]) {
      const bullet = gameScene.enemyBulletGroup.get(this.x, this.y + 10) as EnemyBullet;
      if (!bullet) continue;
      const base = Phaser.Math.RadToDeg(
        Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY),
      );
      bullet.fire(this.x, this.y + 10, base + spread, 220 + gameScene.getStage() * 8);
    }
  }
}

class EnemyBullet extends Phaser.Physics.Arcade.Sprite {
  private lifeTime = 3200;
  private spawnTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "enemyBullet");
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  fire(x: number, y: number, angleDegrees: number, speed: number) {
    this.enableBody(true, x, y, true, true);
    this.setActive(true);
    this.setVisible(true);
    const angle = Phaser.Math.DegToRad(angleDegrees);
    this.setRotation(angle);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.spawnTime = this.scene.time.now;
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (time > this.spawnTime + this.lifeTime) this.disableBody(true, true);
  }
}

class Wingman {
  private readonly scene: GameScene;
  private readonly sprite: Phaser.GameObjects.Arc;
  private angleOffset: number;
  private radius = 52;
  private fireCooldown = 0;

  constructor(scene: GameScene, color: number, angleOffset: number) {
    this.scene = scene;
    this.angleOffset = angleOffset;
    this.sprite = scene.add.circle(scene.player.x, scene.player.y, 10, color, 0.95).setDepth(5);
  }

  update(delta: number) {
    this.angleOffset += delta * 0.0012;
    const px = this.scene.player.x + Math.cos(this.angleOffset) * this.radius;
    const py = this.scene.player.y + Math.sin(this.angleOffset) * this.radius;
    this.sprite.setPosition(px, py);

    this.fireCooldown -= delta;
    if (this.fireCooldown > 0) return;

    const targetAngle = this.scene.getAutoTargetAngle();
    const bullet = this.scene.getBulletGroup().get(px, py) as Bullet;
    if (bullet) {
      bullet.fire(px, py, targetAngle);
      bullet.setTint(0x66ffcc);
    }
    this.fireCooldown = 400;
  }
}

class GameScene extends Phaser.Scene {
  public player!: Player;
  private bulletGroup!: Phaser.Physics.Arcade.Group;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private bossGroup!: Phaser.Physics.Arcade.Group;
  public enemyBulletGroup!: Phaser.Physics.Arcade.Group;
  private healthBarFill!: Phaser.GameObjects.Rectangle;
  private gameOverShown = false;

  private stage = 1;
  private killsInStage = 0;
  private nextBossKillTarget = 25;
  private bossSpawned = false;
  private enemySpawnTimer = 0;
  private wingmen: Wingman[] = [];
  private stageText!: Phaser.GameObjects.Text;
  private bossTimerText!: Phaser.GameObjects.Text;
  private bossCountdownMs = 45000;
  private readonly bossCountdownBaseMs = 45000;
  private difficulty: "easy" | "normal" | "hard" = "easy";
  private difficultyLabelEl: HTMLElement | null = null;
  private bossTimeEl: HTMLElement | null = null;
  private enemyFireRateSlider: HTMLInputElement | null = null;
  private enemySpawnRateSlider: HTMLInputElement | null = null;
  private enemyFireRateLabelEl: HTMLElement | null = null;
  private enemySpawnRateLabelEl: HTMLElement | null = null;
  private enemyFireRateFactor = 0.2;
  private enemySpawnRateFactor = 0.2;

  private readonly difficultySettings = {
    easy: { enemySpeed: 0.48, enemyHp: 1, spawnInterval: 1650, contactDamage: 6, bulletDamage: 3 },
    normal: { enemySpeed: 0.62, enemyHp: 1, spawnInterval: 1350, contactDamage: 10, bulletDamage: 5 },
    hard: { enemySpeed: 0.8, enemyHp: 2, spawnInterval: 1120, contactDamage: 14, bulletDamage: 7 },
  };

  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("player", "assets/Player.png");
  }

  create() {
    this.gameOverShown = false;
    this.stage = 1;
    this.killsInStage = 0;
    this.nextBossKillTarget = 25;
    this.bossSpawned = false;
    this.wingmen = [];
    this.bossCountdownMs = this.bossCountdownBaseMs;

    this.createTextures();

    this.bulletGroup = this.physics.add.group({ classType: Bullet, maxSize: 300, runChildUpdate: true });
    this.enemyGroup = this.physics.add.group({ classType: Enemy, maxSize: 150, runChildUpdate: true });
    this.bossGroup = this.physics.add.group({ classType: Boss, maxSize: 6, runChildUpdate: true });
    this.enemyBulletGroup = this.physics.add.group({ classType: EnemyBullet, maxSize: 300, runChildUpdate: true });

    this.player = new Player(
      this,
      this.cameras.main.centerX,
      this.scale.height * 0.8,
      this.bulletGroup,
      () => -90,
    );

    this.setupDifficultyControls();
    this.setupEnemyRateControls();
    this.difficultyLabelEl = document.getElementById("difficulty-label");
    this.bossTimeEl = document.getElementById("boss-timer-overlay");

    this.createHealthUI();
    this.setupColliders();

    this.stageText = this.add.text(10, 10, "STAGE 1", { fontSize: "20px", color: "#ffffff" }).setScrollFactor(0);
    this.bossTimerText = this
      .add.text(this.scale.width - 12, this.scale.height - 14, "BOSS 00:45", {
        fontSize: "16px",
        color: "#ff9999",
        backgroundColor: "#00000088",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 1)
      .setScrollFactor(0);

    this.updateDifficultyUI();
    this.updateBossTimerUI();

    this.enemySpawnTimer = 300;
  }

  update(time: number, delta: number) {
    if (this.gameOverShown) return;

    this.player.update(time, delta);
    this.updateHealthUI();
    this.wingmen.forEach((w) => w.update(delta));
    this.updateBossCountdown(delta);

    if (this.player.isDestroyed()) {
      this.handleGameOver();
      return;
    }

    if (!this.bossSpawned) {
      this.enemySpawnTimer -= delta;
      if (this.enemySpawnTimer <= 0) {
        this.spawnEnemyLane();
        const spawnBase = this.difficultySettings[this.difficulty].spawnInterval;
        const rateReducer = this.enemySpawnRateFactor * 400;
        this.enemySpawnTimer = Math.max(500, spawnBase - this.stage * 20 - rateReducer);
      }

      if (this.killsInStage >= this.nextBossKillTarget) {
        this.spawnBoss();
      }
    }
  }

  getAutoTargetAngle(): number {
    return -90;
  }

  getEnemySpeedMultiplier() {
    return this.difficultySettings[this.difficulty].enemySpeed;
  }

  getEnemyHp() {
    return this.difficultySettings[this.difficulty].enemyHp;
  }

  getEnemyShootInterval() {
    const base = 2800 - this.enemyFireRateFactor * 1400;
    return Math.max(700, base - this.stage * 30);
  }

  getBulletGroup() {
    return this.bulletGroup;
  }

  isGameOver() {
    return this.gameOverShown;
  }

  getStage() {
    return this.stage;
  }

  private createTextures() {
    const bulletGraphics = this.add.graphics();
    bulletGraphics.fillStyle(0xffff00, 1);
    bulletGraphics.fillCircle(4, 4, 4);
    bulletGraphics.generateTexture("bullet", 8, 8);
    bulletGraphics.destroy();

    const enemyGraphics = this.add.graphics();
    enemyGraphics.fillStyle(0xff4040, 1);
    enemyGraphics.fillRoundedRect(0, 0, 20, 20, 3);
    enemyGraphics.generateTexture("enemy", 20, 20);
    enemyGraphics.destroy();

    const bossGraphics = this.add.graphics();
    bossGraphics.fillStyle(0xaa55ff, 1);
    bossGraphics.fillRoundedRect(0, 0, 64, 48, 8);
    bossGraphics.lineStyle(3, 0xffffff, 0.65);
    bossGraphics.strokeRoundedRect(0, 0, 64, 48, 8);
    bossGraphics.generateTexture("boss", 64, 48);
    bossGraphics.destroy();

    const enemyBulletGraphics = this.add.graphics();
    enemyBulletGraphics.fillStyle(0xffa500, 1);
    enemyBulletGraphics.fillCircle(4, 4, 4);
    enemyBulletGraphics.generateTexture("enemyBullet", 8, 8);
    enemyBulletGraphics.destroy();
  }

  private spawnEnemyLane() {
    const maxCount = this.enemySpawnRateFactor < 0.34 ? 1 : this.enemySpawnRateFactor < 0.67 ? 2 : 3;
    const count = Phaser.Math.Between(1, maxCount);
    for (let i = 0; i < count; i++) {
      const enemy = this.enemyGroup.get(0, 0) as Enemy;
      if (!enemy) return;
      const laneX = ((i + 1) / (count + 1)) * this.scale.width + Phaser.Math.Between(-25, 25);
      enemy.spawn(Phaser.Math.Clamp(laneX, 20, this.scale.width - 20), -20);
    }
  }

  private spawnBoss() {
    this.bossSpawned = true;
    this.bossCountdownMs = this.bossCountdownBaseMs;
    this.updateBossTimerUI();
    const boss = new Boss(this, this.scale.width * 0.5, -60, this.stage);
    this.bossGroup.add(boss, true);
    boss.spawn(this.scale.width * 0.5, -40);
  }

  private createHealthUI() {
    this.add.text(10, 78, "체력", { fontSize: "16px", color: "#ffffff" });
    this.add.rectangle(60, 88, 210, 20, 0x333333).setOrigin(0, 0.5).setScrollFactor(0);
    this.healthBarFill = this.add
      .rectangle(60, 88, 210, 16, 0x00ff66)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
  }

  private updateBossCountdown(delta: number) {
    if (this.bossSpawned || this.gameOverShown) return;
    this.bossCountdownMs -= delta;
    this.updateBossTimerUI();

    if (this.bossCountdownMs <= 0) {
      this.spawnBoss();
    }
  }

  private updateBossTimerUI() {
    const safeMs = Math.max(0, this.bossCountdownMs);
    const totalSec = Math.ceil(safeMs / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");
    const text = `BOSS ${mm}:${ss}`;
    this.bossTimerText?.setText(text);
    if (this.bossTimeEl) this.bossTimeEl.textContent = `BOSS ${mm}:${ss}`;
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
      if (enemy.takeHit(bullet.getDamage())) this.killsInStage += 1;
    });

    this.physics.add.overlap(this.bulletGroup, this.bossGroup, (b, bossObj) => {
      const bullet = b as Bullet;
      const boss = bossObj as Boss;
      bullet.disableBody(true, true);
      if (!boss.takeHit(bullet.getDamage())) return;

      this.stage += 1;
      this.killsInStage = 0;
      this.nextBossKillTarget += 10;
      this.bossSpawned = false;
      this.bossCountdownMs = this.bossCountdownBaseMs;
      this.stageText.setText(`STAGE ${this.stage}`);
      this.updateBossTimerUI();

      const wingmanColor = Phaser.Display.Color.GetColor(60 + this.wingmen.length * 40, 255, 200);
      this.wingmen.push(new Wingman(this, wingmanColor, this.wingmen.length * 1.4));
    });

    this.physics.add.overlap(this.player, this.enemyGroup, (_p, e) => {
      const enemy = e as Enemy;
      enemy.disableBody(true, true);
      this.player.takeDamage(this.difficultySettings[this.difficulty].contactDamage);
    });

    this.physics.add.overlap(this.player, this.bossGroup, (_p, b) => {
      const boss = b as Boss;
      boss.disableBody(true, true);
      this.player.takeDamage(this.difficultySettings[this.difficulty].contactDamage + 12);
    });

    this.physics.add.overlap(this.player, this.enemyBulletGroup, (_p, eb) => {
      const enemyBullet = eb as EnemyBullet;
      enemyBullet.disableBody(true, true);
      this.player.takeDamage(this.difficultySettings[this.difficulty].bulletDamage);
    });
  }

  private setupDifficultyControls() {
    const buttons = document.querySelectorAll<HTMLButtonElement>(".difficulty-btn");
    buttons.forEach((button) => {
      button.onclick = () => {
        this.difficulty = (button.dataset.difficulty as "easy" | "normal" | "hard") ?? "easy";
        this.updateDifficultyUI();
      };
    });
  }


  private setupEnemyRateControls() {
    this.enemyFireRateSlider = document.getElementById("enemy-fire-rate") as HTMLInputElement | null;
    this.enemySpawnRateSlider = document.getElementById("enemy-spawn-rate") as HTMLInputElement | null;
    this.enemyFireRateLabelEl = document.getElementById("enemy-fire-rate-label");
    this.enemySpawnRateLabelEl = document.getElementById("enemy-spawn-rate-label");

    this.enemyFireRateSlider?.addEventListener("input", () => {
      this.enemyFireRateFactor = Number(this.enemyFireRateSlider?.value ?? 20) / 100;
      this.updateEnemyControlUI();
    });

    this.enemySpawnRateSlider?.addEventListener("input", () => {
      this.enemySpawnRateFactor = Number(this.enemySpawnRateSlider?.value ?? 20) / 100;
      this.updateEnemyControlUI();
    });

    this.updateEnemyControlUI();
  }

  private updateEnemyControlUI() {
    this.enemyFireRateFactor = Number(this.enemyFireRateSlider?.value ?? 20) / 100;
    this.enemySpawnRateFactor = Number(this.enemySpawnRateSlider?.value ?? 20) / 100;

    if (this.enemyFireRateLabelEl) {
      this.enemyFireRateLabelEl.textContent = this.getRateText(this.enemyFireRateFactor);
    }

    if (this.enemySpawnRateLabelEl) {
      this.enemySpawnRateLabelEl.textContent = this.getRateText(this.enemySpawnRateFactor);
    }
  }

  private getRateText(value: number) {
    if (value < 0.34) return "낮음";
    if (value < 0.67) return "보통";
    return "높음";
  }

  private updateDifficultyUI() {
    const buttons = document.querySelectorAll<HTMLButtonElement>(".difficulty-btn");
    buttons.forEach((button) => {
      button.classList.toggle("active", button.dataset.difficulty === this.difficulty);
    });
    if (this.difficultyLabelEl) {
      const label = this.difficulty === "easy" ? "쉬움" : this.difficulty === "normal" ? "보통" : "어려움";
      this.difficultyLabelEl.textContent = label;
    }
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

    const retryButton = this.add
      .text(centerX, centerY + 45, "다시 도전", {
        fontSize: "26px",
        color: "#000000",
        backgroundColor: "#ffd54f",
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    retryButton.on("pointerdown", () => this.scene.restart());
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 420,
  height: 880,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [GameScene],
};

new Phaser.Game(config);
