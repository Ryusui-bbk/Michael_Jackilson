import Phaser from "phaser";
import { CONFIG } from '../config/constants.js';

/**
 * Enemy (Orc) — Two-state AI: Idle/Wander ↔ Chase
 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'agent-down-0');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(9);
    this.body.setSize(18, 16);
    this.body.setOffset(7, 14);

    this.hp = CONFIG.ENEMY_HP;
    this.direction = 'down';
    this.state = 'idle';        // 'idle' | 'chase'
    this.isKnockedBack = false;
    this.isDead = false;
    this.isBoss = false;        // Set to true for boss enemies
    this.spawnX = x;
    this.spawnY = y;

    // Wander timer
    this.wanderTimer = 0;
    this.wanderDirX = 0;
    this.wanderDirY = 0;
  }

  update(time, delta, player) {
    if (this.isDead) return;
    if (this.isKnockedBack) return;

    if (!player || player.isDead) {
      this._idle(delta);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (dist < CONFIG.CHASE_RADIUS) {
      this.state = 'chase';
      this._chase(player);
    } else {
      this.state = 'idle';
      this._idle(delta);
    }
  }

  _chase(player) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const vx = Math.cos(angle) * CONFIG.ENEMY_SPEED;
    const vy = Math.sin(angle) * CONFIG.ENEMY_SPEED;
    this.setVelocity(vx, vy);

    // Determine facing direction
    if (Math.abs(vx) > Math.abs(vy)) {
      this.direction = vx < 0 ? 'left' : 'right';
    } else {
      this.direction = vy < 0 ? 'up' : 'down';
    }
    this.play(`agent-walk-${this.direction}`, true);
  }

  _idle(delta) {
    this.wanderTimer -= delta;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = CONFIG.WANDER_INTERVAL + Phaser.Math.Between(-500, 500);
      // 40% chance to stand still, 60% to wander
      if (Math.random() < 0.4) {
        this.wanderDirX = 0;
        this.wanderDirY = 0;
      } else {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        this.wanderDirX = Math.cos(angle);
        this.wanderDirY = Math.sin(angle);
      }
    }

    const speed = CONFIG.ENEMY_SPEED * 0.4;
    this.setVelocity(this.wanderDirX * speed, this.wanderDirY * speed);

    if (this.wanderDirX === 0 && this.wanderDirY === 0) {
      this.play(`agent-idle-${this.direction}`, true);
    } else {
      if (Math.abs(this.wanderDirX) > Math.abs(this.wanderDirY)) {
        this.direction = this.wanderDirX < 0 ? 'left' : 'right';
      } else {
        this.direction = this.wanderDirY < 0 ? 'up' : 'down';
      }
      this.play(`agent-walk-${this.direction}`, true);
    }
  }

  takeDamage(amount, source) {
    if (this.isDead) return;
    this.hp -= amount;

    // Flash white
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (!this.isDead) this.clearTint();
    });

    // Knockback
    if (source) {
      this.isKnockedBack = true;
      const angle = Phaser.Math.Angle.Between(source.x, source.y, this.x, this.y);
      // Reduced knockback for bosses
      const kbForce = this.isBoss ? CONFIG.KNOCKBACK_FORCE * 0.5 : CONFIG.KNOCKBACK_FORCE;
      this.setVelocity(
        Math.cos(angle) * kbForce,
        Math.sin(angle) * kbForce,
      );
      this.scene.time.delayedCall(CONFIG.KNOCKBACK_DURATION, () => {
        this.isKnockedBack = false;
        this.setVelocity(0, 0);
      });
    }

    // Damage number floating up
    const dmgText = this.scene.add.text(this.x, this.y - 16, `-${amount}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#ff4444',
      stroke: '#220000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50);
    this.scene.tweens.add({
      targets: dmgText, y: dmgText.y - 30, alpha: 0,
      duration: 600, ease: 'Power2',
      onComplete: () => dmgText.destroy(),
    });

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    this.isDead = true;
    this.setVelocity(0, 0);
    this.body.enable = false;

    // Death flash
    this.setTintFill(0xff4444);

    // Death animation
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        // Inform scene of death
        if (this.scene && this.scene.onEnemyDied) {
          this.scene.onEnemyDied(this.x, this.y);
        }

        // Boss enemies don't respawn
        if (!this.isBoss) {
          // Respawn after delay
          this.scene.time.delayedCall(CONFIG.RESPAWN_DELAY, () => {
            this.respawn();
          });
        }

        this.setVisible(false);
        this.setActive(false);
      },
    });
  }

  respawn() {
    if (!this.scene) return;
    this.hp = CONFIG.ENEMY_HP;
    this.isDead = false;
    this.isKnockedBack = false;
    this.state = 'idle';
    this.wanderTimer = 0;

    // Respawn at original position (with some randomness)
    const rx = this.spawnX + Phaser.Math.Between(-48, 48);
    const ry = this.spawnY + Phaser.Math.Between(-48, 48);
    this.setPosition(rx, ry);

    this.body.enable = true;
    this.setVisible(true);
    this.setActive(true);
    this.setAlpha(0);
    this.setScale(1);
    this.clearTint();

    // Fade in
    this.scene.tweens.add({
      targets: this, alpha: 1,
      duration: 500, ease: 'Power2',
    });
  }
}
