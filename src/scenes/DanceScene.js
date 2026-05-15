import Phaser from "phaser";
import { CONFIG } from '../config/constants.js';
import { Album } from '../objects/Album.js';
import { HUD } from '../ui/HUD.js';
import { DialogueBox } from '../ui/DialogueBox.js';
import { music } from '../utils/MusicManager.js';
import { sfx } from '../utils/SFXManager.js';

export class DanceScene extends Phaser.Scene {
  constructor() { super('DanceScene'); }

  init(data) {
    this.mode = data.mode || 'speed';
    this.albumsCollected = data.albums || 4;
    this.level = 5;
    this.isGameOver = false;
    this.score = 0;
    this.targetScore = 15;
    this.isDialogueActive = false;
  }

  create() {
    this.cameras.main.fadeIn(600, 0, 0, 0);
    
    // Background
    this.bgGraphics = this.add.graphics().setDepth(0);


    // Receptacles
    this.targets = {};
    this.setupTargets();

    this.arrows = [];

    // Player visual
    this.playerVisual = this.add.sprite(this.scale.width / 2, this.scale.height - 40, `dancer-${this.mode}-down-0`).setScale(2);

    // HUD
    this.hud = new HUD(this);
    const songNames = { speed: 'Smooth Bandit', hard: 'Chiller', tank: 'Bop It' };
    this.hud.setup(10, songNames[this.mode] || 'Smooth Bandit');
    this.hud.updateAlbums(this.albumsCollected);
    this.hud.updateObjective(`Fase 5: Ritmo! Acertos: 0/${this.targetScore}`);

    // Dialogue Box
    this.dialogueBox = new DialogueBox(this);
    this.isDialogueActive = true;
    
    this.input.keyboard.on('keydown-SPACE', () => {
        if (this.dialogueBox.visible) {
            this.dialogueBox.handleInput();
            if (!this.dialogueBox.visible) {
                this.isDialogueActive = false;
                this._startSpawning();
            }
        }
    });

    this.input.keyboard.on('keydown-P', () => {
        if (!this.dialogueBox.visible && !this.isGameOver) {
            this.scene.pause();
            this.scene.launch('PauseScene', { parentScene: 'DanceScene' });
        }
    });

    this.time.delayedCall(1000, () => {

        this.dialogueBox.startDialogue([
            "QUASE LÁ... CONSIGO SENTIR O CHEFE DA SONY POR PERTO.",
            "ESSA DANÇA SERÁ MINHA LIBERTAÇÃO!",
            "ELES NÃO VÃO ME SEGURAR POR MAIS TEMPO!"
        ]);
    });

    this.updateLayout();

    // Track input

    this.input.keyboard.on('keydown', this._handleInput, this);
  }

  setupTargets() {
    const { width, height } = this.scale;
    const keys = ['left', 'up', 'down', 'right'];
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
    const spacing = 80;
    const startX = width / 2 - (spacing * 1.5);
    const targetY = height - 80;
    
    keys.forEach((dir, i) => {
      const x = startX + i * spacing;
      const target = this.add.circle(x, targetY, 20, colors[i]).setAlpha(0.3).setStrokeStyle(3, 0xffffff);
      const label = dir === 'left' ? '←' : dir === 'right' ? '→' : dir === 'up' ? '↑' : '↓';
      const text = this.add.text(x, targetY, label, { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
      this.targets[dir] = { x, target, text, color: colors[i] };
    });
  }

  updateLayout() {
    if (!this.cameras || !this.cameras.main || !this.bgGraphics || !this.targets) return;
    const { width, height } = this.cameras.main;
    
    this.bgGraphics.clear();
    this.bgGraphics.fillGradientStyle(0x110022, 0x110022, 0x000000, 0x000000, 1);
    this.bgGraphics.fillRect(0, 0, width, height);
    
    const spacing = 80;
    const startX = width / 2 - (spacing * 1.5);
    const targetY = height - 80;
    
    const keys = ['left', 'up', 'down', 'right'];
    keys.forEach((dir, i) => {
      const x = startX + i * spacing;
      if (this.targets[dir]) {
          this.targets[dir].x = x;
          if (this.targets[dir].target) this.targets[dir].target.setPosition(x, targetY);
          if (this.targets[dir].text) this.targets[dir].text.setPosition(x, targetY);
      }
    });

    if (this.playerVisual) this.playerVisual.setPosition(width / 2, height - 40);
  }



  _startSpawning() {
    this.time.addEvent({
      delay: this.mode === 'hard' ? 600 : 800,
      callback: this._spawnArrow,
      callbackScope: this,
      loop: true
    });
  }

  _spawnArrow() {
    if (this.isGameOver || this.isDialogueActive) return;
    const keys = ['left', 'up', 'down', 'right'];
    const dir = Phaser.Math.RND.pick(keys);
    const { x, color } = this.targets[dir];
    
    const arrow = this.add.circle(x, -20, 15, color);
    arrow.setStrokeStyle(2, 0xffffff);
    arrow.direction = dir;
    this.arrows.push(arrow);
  }

  _handleInput(event) {
    if (this.isGameOver || this.isDialogueActive) return;
    
    let dir = null;
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') dir = 'left';
    else if (event.code === 'ArrowUp' || event.code === 'KeyW') dir = 'up';
    else if (event.code === 'ArrowDown' || event.code === 'KeyS') dir = 'down';
    else if (event.code === 'ArrowRight' || event.code === 'KeyD') dir = 'right';

    if (!dir) return;

    this.playerVisual.anims.play(`dancer-${this.mode}-sing-${dir}`, true);

    // Check collision
    let hit = false;
    const targetY = this.scale.height - 80;
    
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      if (!arrow.active) continue;
      if (arrow.direction === dir && Math.abs(arrow.y - targetY) < 30) {
        hit = true;
        arrow.destroy();
        this.arrows.splice(i, 1);
        
        this.score++;
        this.hud.updateObjective(`Fase 5: Ritmo! Acertos: ${this.score}/${this.targetScore}`);
        sfx.noteHit();

        // Dance Bop!
        this.playerVisual.play(`dancer-${this.mode}-dance`, true);
        this.tweens.add({
          targets: this.playerVisual,
          scaleX: 2.8, scaleY: 2.8,
          duration: 80, yoyo: true,
          ease: 'Back.easeOut'
        });

        // Shake and Particles
        this.cameras.main.shake(100, 0.005);
        this._spawnParticles(this.targets[dir].x, targetY, this.targets[dir].color);

        const t = this.targets[dir].target;
        this.tweens.add({ targets: t, scale: 1.5, alpha: 1, duration: 100, yoyo: true });


        if (this.score >= this.targetScore) {
          this.isGameOver = true;
          this.hud.updateObjective('Fase 5: Álbum Liberado!');
          
          const album = new Album(this, this.scale.width / 2, this.scale.height / 2, this.albumsCollected);
          this.add.existing(album);
          
          this.time.delayedCall(1000, () => {
             album.collect();
             sfx.collectAlbum();
             this.albumsCollected++;
             this.cameras.main.fadeOut(800, 0, 0, 0);
             this.time.delayedCall(800, () => {
                this.scene.start('BossScene', { mode: this.mode, albums: this.albumsCollected });
             });
          });
        }
        break;
      }
    }

    if (!hit) {
      this.cameras.main.shake(100, 0.01);
    }
  }

  update(time, delta) {
    if (this.isGameOver || this.isDialogueActive) return;
    
    const speed = 250; // pixels per second
    
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      arrow.y += speed * (delta / 1000);
      
      if (arrow.y > this.scale.height + 20) {
        arrow.destroy(); // Missed
        this.arrows.splice(i, 1);
        this.cameras.main.shake(100, 0.005);
      }
    }
  }

  _spawnParticles(x, y, color) {

    for (let i = 0; i < 12; i++) {
      const p = this.add.rectangle(x, y, 4, 4, color);
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 200 + 100;
      this.physics.add.existing(p);
      p.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.tweens.add({
        targets: p,
        alpha: 0,
        scale: 0.2,
        duration: 400,
        onComplete: () => p.destroy()
      });
    }
  }
}


