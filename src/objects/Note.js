import Phaser from "phaser";
import { CONFIG } from '../config/constants.js';

export class Note extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'note');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(15);

    // Centered hitbox — 12×12 in the middle of the 24×24 sprite
    this.body.setSize(12, 12);
    this.body.setOffset(6, 6);

    this.damage = CONFIG.NOTE_DAMAGE;
    this.hasSplatted = false;

    // Shadow
    this.shadow = scene.add.image(x, y + 8, 'note-shadow');
    this.shadow.setDepth(14);
    this.shadow.setAlpha(0.5);

    // Spin
    scene.tweens.add({
      targets: this,
      angle: 360,
      duration: 280,
      repeat: -1
    });

    // Glow pulse
    scene.tweens.add({
      targets: this,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 120,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.updateListener = () => this._syncShadow();
    scene.events.on('update', this.updateListener);
  }

  fire(dirX, dirY, playerVelocityX = 0, playerVelocityY = 0) {
    const speed = CONFIG.NOTE_SPEED;
    let vx = dirX * speed + playerVelocityX * 0.5;
    let vy = dirY * speed + playerVelocityY * 0.5;
    this.setVelocity(vx, vy);

    // Auto-destroy after lifetime
    this.scene.time.delayedCall(CONFIG.NOTE_LIFETIME, () => {
      if (this.active && !this.hasSplatted) {
        this.hasSplatted = true;
        this.splat();
      }
    });
  }

  _syncShadow() {
    if (this.shadow && this.shadow.active && this.body) {
      this.shadow.setPosition(this.body.x + this.body.width / 2, this.body.y + this.body.height + 6);
    }
  }

  splat() {
    if (!this.active) return;

    this.body.enable = false;
    this.setVelocity(0, 0);
    this.setRotation(0);

    this.scene.tweens.killTweensOf(this);

    // Burst particles
    for (let i = 0; i < 5; i++) {
      const px = this.x + Phaser.Math.Between(-8, 8);
      const py = this.y + Phaser.Math.Between(-8, 8);
      const p = this.scene.add.image(px, py, 'particle-note').setDepth(20).setAlpha(1).setScale(0.8);
      this.scene.tweens.add({
        targets: p,
        x: px + Phaser.Math.Between(-20, 20),
        y: py + Phaser.Math.Between(-20, 20),
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: Phaser.Math.Between(150, 300),
        onComplete: () => p.destroy(),
      });
    }

    // Squash & fade
    this.scene.tweens.add({
      targets: [this, this.shadow],
      scaleX: 1.8,
      scaleY: 0.1,
      alpha: 0,
      duration: 140,
      ease: 'Power2',
      onComplete: () => {
        if (this.shadow) this.shadow.destroy();
        this.destroy();
      }
    });
  }

  destroy(fromScene) {
    if (this.scene) this.scene.events.off('update', this.updateListener);
    if (this.shadow && !fromScene) this.shadow.destroy();
    super.destroy(fromScene);
  }
}
