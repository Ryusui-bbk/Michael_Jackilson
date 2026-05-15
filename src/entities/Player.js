import Phaser from "phaser";
import { CONFIG } from '../config/constants.js';
import { music } from '../utils/MusicManager.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, mode = 'speed') {
    const skin = Player.skinForMode(mode);
    super(scene, x, y, `dancer-${skin}-down-0`);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(10);
    this.body.setSize(14, 14);
    this.body.setOffset(9, 12);

    this.skin = skin;
    this.maxHp = CONFIG.PLAYER_MAX_HP;
    this.hp = this.maxHp;
    this.speed = CONFIG.PLAYER_SPEED;
    this.direction = 'down';
    this.canShoot = true;
    this.isSinging = false;
    this.invulnerable = false;
    this.isDead = false;
    this.albums = 0;

    // SFX ref (injected by GameScene)
    this.sfx = null;

    // Input
    this.shootKeys = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
  }

  static skinForMode(mode) {
    const map = { speed: 'speed', hard: 'hard', tank: 'tank' };
    return map[mode] || 'speed';
  }

  update() {
    if (this.isDead) return;

    const speed = this.speed;
    let vx = 0, vy = 0;

    const left  = this.wasd.left.isDown;
    const right = this.wasd.right.isDown;
    const up    = this.wasd.up.isDown;
    const down  = this.wasd.down.isDown;

    if (left)       vx = -1;
    else if (right) vx = 1;
    if (up)         vy = -1;
    else if (down)  vy = 1;

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      const norm = Math.SQRT1_2;
      vx *= norm;
      vy *= norm;
    }

    this.setVelocity(vx * speed, vy * speed);

    // Shooting — 8 directions via arrow keys
    let sx = 0, sy = 0;
    if (this.canShoot) {
      if (this.shootKeys.left.isDown)  sx = -1;
      else if (this.shootKeys.right.isDown) sx = 1;
      if (this.shootKeys.up.isDown)    sy = -1;
      else if (this.shootKeys.down.isDown)  sy = 1;

      if (sx !== 0 || sy !== 0) {
        if (sx !== 0 && sy !== 0) {
          const norm = Math.SQRT1_2;
          sx *= norm;
          sy *= norm;
        }
        this.shootVector(sx, sy);
      }
    }

    // Animation & Moonwalk logic
    if (!this.isSinging) {
      if (vx !== 0 || vy !== 0) {
        // Moonwalk: face opposite of movement direction
        if (vx < 0)       this.direction = 'right';
        else if (vx > 0)  this.direction = 'left';
        else if (vy < 0)  this.direction = 'down';
        else if (vy > 0)  this.direction = 'up';

        const walkKey = `dancer-${this.skin}-walk-${this.direction}`;
        this.anims.play(walkKey, true);
      } else {
        this.anims.play(`dancer-${this.skin}-idle-${this.direction}`, true);
      }
    }
  }

  shootVector(sx, sy) {
    if (!this.canShoot || this.isDead) return;

    this.canShoot = false;
    this.isSinging = true;

    // Visual direction for the arm extension
    if (Math.abs(sx) > Math.abs(sy)) {
      this.direction = sx > 0 ? 'right' : 'left';
    } else {
      this.direction = sy > 0 ? 'down' : 'up';
    }

    this.anims.play(`dancer-${this.skin}-sing-${this.direction}`, true);

    // SFX
    if (this.sfx) this.sfx.shoot();

    // Spawn note
    if (this.scene && this.scene.spawnNote) {
      const offset = 10;
      let ox = 0, oy = 0;
      if (sx < 0)      ox = -offset;
      else if (sx > 0) ox = offset;
      if (sy < 0)      oy = -offset;
      else if (sy > 0) oy = offset;
      this.scene.spawnNote(this.x + ox, this.y + oy, sx, sy, this.body.velocity.x, this.body.velocity.y);
    }

    this.scene.time.delayedCall(180, () => { this.isSinging = false; });
    this.scene.time.delayedCall(CONFIG.FIRE_RATE, () => { this.canShoot = true; });
  }

  takeDamage(amount, source) {
    if (this.invulnerable || this.isDead) return;
    this.hp -= amount;
    this.invulnerable = true;

    if (this.sfx) this.sfx.playerHit();

    this.scene.cameras.main.shake(120, 0.012);
    this.setTintFill(0xff4444);
    this.scene.time.delayedCall(120, () => this.clearTint());

    if (source) {
      const angle = Phaser.Math.Angle.Between(source.x, source.y, this.x, this.y);
      this.setVelocity(
        Math.cos(angle) * CONFIG.KNOCKBACK_FORCE * 1.5,
        Math.sin(angle) * CONFIG.KNOCKBACK_FORCE * 1.5,
      );
      this.scene.time.delayedCall(180, () => this.setVelocity(0, 0));
    }

    this.scene.tweens.add({
      targets: this, alpha: 0.25,
      duration: 80, yoyo: true, repeat: 6,
      onComplete: () => { this.setAlpha(1); },
    });

    this.scene.time.delayedCall(CONFIG.PLAYER_INVULN_MS, () => {
      this.invulnerable = false;
    });

    if (this.scene.hud) this.scene.hud.updateHealth(this.hp, this.maxHp);

    if (this.hp <= 0) this.die();
  }

  die() {
    this.isDead = true;
    music.stop();
    this.setVelocity(0, 0);

    if (this.sfx) this.sfx.playerDie();

    // Play death animation frames first
    const deathKey = `dancer-${this.skin}-death`;
    if (this.scene.anims.exists(deathKey)) {
      this.anims.play(deathKey, true);
    }

    // Flash red
    this.setTintFill(0xff0000);

    // Dramatic death tween — spin + shrink
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      angle: 720,
      duration: 900,
      ease: 'Power3',
      delay: 400,
      onComplete: () => {
        this.scene.time.delayedCall(600, () => {
          this.scene.scene.start('GameOverScene', { won: false, albums: this.albums });
        });
      },
    });
  }

  collectAlbum() {
    this.albums++;
    if (this.sfx) this.sfx.collectAlbum();
    if (this.scene.hud) this.scene.hud.updateAlbums(this.albums);
  }
}
