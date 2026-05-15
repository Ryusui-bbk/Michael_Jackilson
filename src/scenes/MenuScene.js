import Phaser from "phaser";
import { music } from '../utils/MusicManager.js';
import { menuMusic } from '../utils/MenuMusic.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    music.setScene(this);
    music.stop();
    menuMusic.stop();

    this.badMusic = this.sound.add('music-bad', { loop: true, volume: 0.5 });
    this.time.delayedCall(100, () => {
      if (!this.badMusic.isPlaying) this.badMusic.play();
    });

    // Create groups for easy repositioning
    this.bgGraphics = this.add.graphics().setDepth(0);
    this.particlesGroup = this.add.group();
    this.uiGroup = this.add.container(0, 0).setDepth(10);

    this.setupUI();
    this.updateLayout();

    this.cameras.main.fadeIn(800, 0, 0, 0);
  }


  setupUI() {
    // We'll create elements and then position them in updateLayout
    this.title = this.add.text(0, 0, 'NEON\nGROOVER', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '48px',
      color: '#ffcc00',
      align: 'center',
      lineSpacing: 16,
      stroke: '#442200',
      strokeThickness: 8,
      shadow: { offsetX: 4, offsetY: 4, color: '#111111', blur: 0, fill: true },
    }).setOrigin(0.5);
    this.uiGroup.add(this.title);

    // Title glow pulse
    this.tweens.add({
      targets: this.title,
      alpha: { from: 1, to: 0.7 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.subtitle = this.add.text(0, 0, 'SELECIONE O MODO DE JOGO', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.uiGroup.add(this.subtitle);

    // --- MODE BUTTONS ---
    const modes = [
      { name: 'SMOOTH BANDIT', color: 0xaa2222, mode: 'speed', desc: 'Velocidade Máxima' },
      { name: 'CHILLER',        color: 0x222222, mode: 'hard',  desc: 'Dano Dobrado (Agentes)' },
      { name: 'BOP IT',         color: 0x2222aa, mode: 'tank',  desc: 'Vida Dobrada (Dançarino)' }
    ];

    this.buttons = [];
    modes.forEach((m, i) => {
      const container = this.add.container(0, 0);
      
      const btnBg = this.add.rectangle(0, 0, 360, 64, m.color, 1)
        .setStrokeStyle(3, 0xffffff)
        .setInteractive({ useHandCursor: true });

      const btnText = this.add.text(0, -10, m.name, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '16px',
        color: '#ffffff',
      }).setOrigin(0.5);

      const btnDesc = this.add.text(0, 16, m.desc, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: '#aaaaaa',
      }).setOrigin(0.5);

      container.add([btnBg, btnText, btnDesc]);
      this.uiGroup.add(container);
      this.buttons.push({ container, btnBg, btnText, mode: m.mode });

      btnBg.on('pointerover', () => {
        btnBg.setStrokeStyle(5, 0xffcc00);
        btnText.setScale(1.1);
        this.tweens.add({ targets: container, scale: 1.05, duration: 100 });
      });
      btnBg.on('pointerout', () => {
        btnBg.setStrokeStyle(3, 0xffffff);
        btnText.setScale(1);
        this.tweens.add({ targets: container, scale: 1, duration: 100 });
      });
      btnBg.on('pointerdown', () => {
        btnBg.disableInteractive();
        this._showWhosBad(m.mode);
      });
    });

    this.controlsInfo = this.add.text(0, 0, 'WASD = Mover | Setas = Atirar', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    this.uiGroup.add(this.controlsInfo);
  }

  updateLayout() {
    if (!this.bgGraphics || !this.uiGroup || !this.cameras || !this.cameras.main) return;

    const { width, height } = this.cameras.main;
    
    // 1. Redraw background using native gradient (MUCH FASTER)
    this.bgGraphics.clear();
    this.bgGraphics.fillGradientStyle(0x0f050a, 0x0f050a, 0x32050f, 0x32050f, 1);
    this.bgGraphics.fillRect(0, 0, width, height);
    
    this.bgGraphics.fillStyle(0x000000, 0.4);
    this.bgGraphics.fillRect(0, height * 0.9, width, height * 0.1);

    // 2. Position UI elements
    if (this.title) this.title.setPosition(width / 2, height * 0.2);
    if (this.subtitle) this.subtitle.setPosition(width / 2, height * 0.35);

    if (this.buttons) {
      this.buttons.forEach((btn, i) => {
        if (btn.container) btn.container.setPosition(width / 2, height * (0.5 + i * 0.15));
      });
    }

    if (this.controlsInfo) this.controlsInfo.setPosition(width / 2, height * 0.95);

    // 3. Update particles (don't clear, just reposition some or ignore to avoid heavy lag)
    if (this.particlesGroup && this.particlesGroup.getLength() === 0) {
      this._createParticles(width, height);
    }
  }



  _createParticles(w, h) {
    for (let i = 0; i < 30; i++) {
      const color = Math.random() > 0.5 ? 0xffcc00 : 0xff00ff;
      const dot = this.add.circle(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, h),
        Phaser.Math.Between(1, 3),
        color,
        Phaser.Math.FloatBetween(0.1, 0.5)
      );
      this.particlesGroup.add(dot);
      this.tweens.add({
        targets: dot,
        y: dot.y - Phaser.Math.Between(50, 150),
        alpha: 0,
        duration: Phaser.Math.Between(2000, 5000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
        onRepeat: () => {
          dot.x = Phaser.Math.Between(0, w);
          dot.y = Phaser.Math.Between(h * 0.5, h);
          dot.alpha = Phaser.Math.FloatBetween(0.1, 0.5);
        },
      });
    }
  }

  _showWhosBad(mode) {
    const { width, height } = this.scale;
    const overlay = this.add.graphics().setDepth(1000);
    overlay.fillStyle(0x000000, 0);
    overlay.fillRect(0, 0, width, height);

    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 300,
      onUpdate: (tw) => {
        overlay.clear();
        overlay.fillStyle(0x110000, tw.progress * 0.85);
        overlay.fillRect(0, 0, width, height);
      }
    });

    // Create blood canvas based on CURRENT scale
    const bloodCanvas = document.createElement('canvas');
    bloodCanvas.width  = width;
    bloodCanvas.height = height;
    const bctx = bloodCanvas.getContext('2d');

    this._drawBloodBlob(bctx, width / 2, height / 2, Math.min(width, height) * 0.3, '#8b0000');
    
    // Scatter more blobs
    for(let i=0; i<8; i++) {
        this._drawBloodBlob(bctx, Math.random()*width, Math.random()*height, 50+Math.random()*50, '#8b0000');
    }

    this._drawBloodDrips(bctx, width, height);
    this._drawBloodSmears(bctx, width, height);

    const texKey = 'blood-' + Date.now();
    this.textures.addImage(texKey, bloodCanvas);
    const bloodImg = this.add.image(width/2, height/2, texKey).setDepth(1001).setAlpha(0);

    this.sound.play('sfx-whos-bad', { volume: 1.0 });
    if (this.badMusic) this.badMusic.stop();

    this.tweens.add({
      targets: bloodImg,
      alpha: 1,
      scale: { from: 0.2, to: 1 },
      duration: 250,
      ease: 'Back.Out'
    });

    const whoText = this.add.text(width / 2, height / 2, "WHO'S BAD?", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 'min(8vw, 64px)',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 10,
      shadow: { offsetX: 4, offsetY: 4, color: '#000000', blur: 10, fill: true },
    }).setOrigin(0.5).setDepth(1002).setAlpha(0).setAngle(-5);

    this.tweens.add({
      targets: whoText,
      alpha: 1,
      scale: { from: 5, to: 1 },
      duration: 400,
      delay: 200,
      ease: 'Bounce.Out',
      onComplete: () => {
        this.cameras.main.shake(300, 0.03);
        this.time.delayedCall(1200, () => {
          this.cameras.main.fadeOut(500, 0, 0, 0);
          this.time.delayedCall(500, () => {
            this.scene.start('CutsceneScene', {
              cutsceneId: 'intro',
              mode: mode,
              albums: 0,
              nextScene: 'GameScene',
              nextData: { mode: mode, level: 1, albums: 0 }
            });
          });
        });
      }
    });
  }

  _drawBloodBlob(ctx, cx, cy, radius, color) {
    const points = 20;
    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const r = radius * (0.6 + Math.random() * 0.7);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  _drawBloodDrips(ctx, w, h) {
    ctx.fillStyle = '#8b0000';
    for(let i=0; i<10; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h * 0.4;
        const len = 50 + Math.random() * 200;
        ctx.fillRect(x, y, 4 + Math.random()*6, len);
        ctx.beginPath();
        ctx.arc(x + 3, y + len, 6, 0, Math.PI*2);
        ctx.fill();
    }
  }

  _drawBloodSmears(ctx, w, h) {
    ctx.strokeStyle = '#770000';
    ctx.lineWidth = 20;
    ctx.globalAlpha = 0.4;
    for(let i=0; i<5; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random()*w, Math.random()*h);
        ctx.lineTo(Math.random()*w, Math.random()*h);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

