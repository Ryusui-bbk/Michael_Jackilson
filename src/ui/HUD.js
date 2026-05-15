import Phaser from "phaser";
import { CONFIG } from '../config/constants.js';

export class HUD extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setScrollFactor(0);
    this.setDepth(10000); 

    this.hearts = [];
    this.albumCount = 0;
  }

  setup(maxHp, songName) {
    this._createHearts(maxHp);
    this._createAlbumCounter();
    this._createSongLabel(songName);
    this.updateLayout();
  }

  updateLayout() {
    if (!this.scene || !this.scene.cameras || !this.scene.cameras.main) return;
    const { width, height } = this.scene.cameras.main;
    
    if (this.songLabel) this.songLabel.setPosition(width - 20, 20);
    if (this.objectiveText) this.objectiveText.setPosition(width / 2, 40);
  }

  updateHealth(hp, maxHp) {
    const fullHearts = Math.floor(hp / 2);
    this.hearts.forEach((heart, i) => {
      if (i < fullHearts) {
        heart.setTexture('heart-v2');
      } else {
        heart.setTexture('heart-empty-v2');
      }
    });
  }


  updateAlbums(count) {
    this.albumCount = count;
    if (this.albumText) {
      this.albumText.setText(`x${count}`);
    }
  }

  updateObjective(text) {
    if (!this.objectiveText) {
      this.objectiveText = this.scene.add.text(0, 0, text, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#00ffcc',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5);
      this.add(this.objectiveText);
    } else {
      this.objectiveText.setText(text);
    }
    this.updateLayout();
  }

  _createHearts(maxHp) {
    const maxHearts = maxHp / 2;
    for (let i = 0; i < maxHearts; i++) {
      // Use v2 key and tiny scale
      const heart = this.scene.add.image(20 + i * 22, 20, 'heart-v2').setScale(0.5);
      this.hearts.push(heart);
      this.add(heart);
    }
  }

  _createAlbumCounter() {
    // Use v2 key and small scale
    this.albumIcon = this.scene.add.image(20, 50, 'album-v2').setScale(0.5);
    this.albumText = this.scene.add.text(40, 50, `x${this.albumCount}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0, 0.5);
    this.add([this.albumIcon, this.albumText]);
  }







  _createSongLabel(name) {
    this.songLabel = this.scene.add.text(0, 0, `SONG: ${name.toUpperCase()}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#aaaaaa'
    }).setOrigin(1, 0);
    this.add(this.songLabel);
  }
}
