import Phaser from "phaser";
import { CONFIG } from './config/constants.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { DanceScene } from './scenes/DanceScene.js';
import { BossScene } from './scenes/BossScene.js';
import { CutsceneScene } from './scenes/CutsceneScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { PauseScene } from './scenes/PauseScene.js';


const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  scene: [BootScene, MenuScene, CutsceneScene, GameScene, DanceScene, BossScene, GameOverScene, PauseScene],
};


const game = new Phaser.Game(config);
