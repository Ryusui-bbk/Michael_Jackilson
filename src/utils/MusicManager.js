import Phaser from "phaser";
export class MusicManager {
  constructor() {
    this.currentMusic = null;
    this.scene = null;
  }

  setScene(scene) {
    this.scene = scene;
  }

  playMode(mode) {
    this.stop();
    if (!this.scene) return;

    const key = `music-${mode}`;
    if (this.scene.cache.audio.exists(key)) {
      // Resume context if suspended (browser autoplay policy)
      if (this.scene.sound.context.state === 'suspended') {
          this.scene.sound.context.resume();
      }
      this.currentMusic = this.scene.sound.add(key, { loop: true, volume: 0.5 });
      this.currentMusic.play();
    }
  }

  stop() {
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic.destroy();
      this.currentMusic = null;
    }
    // Also stop any global sounds if scene is available
    if (this.scene && this.scene.sound) {
        this.scene.sound.stopAll();
    }
  }
}

export const music = new MusicManager();
