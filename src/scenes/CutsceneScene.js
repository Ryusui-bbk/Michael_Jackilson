import Phaser from "phaser";

/**
 * CutsceneScene — Full-screen cinematic cutscenes with typewriter text,
 * animated backgrounds, portrait display, and dramatic transitions.
 * 
 * Usage:
 *   this.scene.start('CutsceneScene', {
 *     cutsceneId: 'intro' | 'pre_level2' | ... | 'boss_intro' | 'victory',
 *     mode: 'speed',
 *     albums: 0,
 *     nextScene: 'GameScene',
 *     nextData: { mode: 'speed', level: 1, albums: 0 }
 *   });
 */
export class CutsceneScene extends Phaser.Scene {
  constructor() { super('CutsceneScene'); }

  init(data) {
    this.cutsceneId = data.cutsceneId || 'intro';
    this.mode = data.mode || 'speed';
    this.albums = data.albums || 0;
    this.nextScene = data.nextScene || 'GameScene';
    this.nextData = data.nextData || {};
  }

  create() {
    const { width, height } = this.cameras.main;
    this.cameras.main.fadeIn(800, 0, 0, 0);

    // Background
    this.bg = this.add.graphics().setDepth(0);
    this._drawBackground(width, height);

    // Animated particles
    this._createAtmosphere(width, height);

    // Portrait container
    this.portraitImage = this.add.image(width * 0.15, height * 0.45, 'portrait-mj')
      .setDisplaySize(160, 160).setAlpha(0).setDepth(10);

    // Portrait frame
    this.portraitFrame = this.add.graphics().setDepth(11);

    // Cinematic bars (top and bottom)
    this.topBar = this.add.rectangle(width / 2, 0, width, 60, 0x000000).setOrigin(0.5, 0).setDepth(50);
    this.bottomBar = this.add.rectangle(width / 2, height, width, 60, 0x000000).setOrigin(0.5, 1).setDepth(50);

    // Title text (shown briefly)
    this.titleText = this.add.text(width / 2, height * 0.15, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '20px',
      color: '#ffcc00',
      stroke: '#442200',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    // Main dialogue text
    this.dialogueText = this.add.text(width * 0.35, height * 0.35, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#ffffff',
      wordWrap: { width: width * 0.55 },
      lineSpacing: 10
    }).setDepth(100).setAlpha(0);

    // Speaker name
    this.speakerText = this.add.text(width * 0.35, height * 0.28, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: '#00ffcc',
      stroke: '#003322',
      strokeThickness: 3
    }).setDepth(100).setAlpha(0);

    // Skip prompt
    this.skipText = this.add.text(width - 30, height - 25, 'ESPAÇO: Continuar', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px',
      color: '#666666'
    }).setOrigin(1, 1).setDepth(100);
    this.tweens.add({
      targets: this.skipText,
      alpha: { from: 1, to: 0.3 },
      duration: 800, yoyo: true, repeat: -1
    });

    // Cutscene data
    const cutsceneData = this._getCutsceneData();
    this.slides = cutsceneData.slides;
    this.currentSlide = 0;
    this.isTyping = false;
    this.typingTimer = null;

    // Input
    this.input.keyboard.on('keydown-SPACE', () => this._advance());
    this.input.on('pointerdown', () => this._advance());

    // Start first slide
    this.time.delayedCall(500, () => this._showSlide(0));
  }

  _drawBackground(w, h) {
    this.bg.clear();
    const bgColors = {
      'intro': { t: 0x0a0015, b: 0x1a0030 },
      'pre_level2': { t: 0x000a1a, b: 0x001530 },
      'pre_level3': { t: 0x1a0a00, b: 0x301500 },
      'pre_level4': { t: 0x0a001a, b: 0x150030 },
      'pre_level5': { t: 0x001a0a, b: 0x003015 },
      'pre_dance': { t: 0x1a001a, b: 0x300030 },
      'boss_intro': { t: 0x1a0000, b: 0x300000 },
      'victory': { t: 0x0a0a1a, b: 0x1a1a30 },
    };
    const colors = bgColors[this.cutsceneId] || bgColors['intro'];
    this.bg.fillGradientStyle(colors.t, colors.t, colors.b, colors.b, 1);
    this.bg.fillRect(0, 0, w, h);
  }

  _createAtmosphere(w, h) {
    const colors = [0xffcc00, 0xff00ff, 0x00ffcc, 0xff4444];
    for (let i = 0; i < 20; i++) {
      const dot = this.add.circle(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, h),
        Phaser.Math.Between(1, 3),
        colors[i % colors.length],
        Phaser.Math.FloatBetween(0.05, 0.2)
      ).setDepth(1);
      this.tweens.add({
        targets: dot,
        y: dot.y - Phaser.Math.Between(40, 120),
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        onRepeat: () => {
          dot.x = Phaser.Math.Between(0, w);
          dot.y = Phaser.Math.Between(h * 0.5, h);
          dot.alpha = Phaser.Math.FloatBetween(0.05, 0.2);
        }
      });
    }
  }

  _getCutsceneData() {
    const cutscenes = {
      'intro': {
        slides: [
          { speaker: 'NARRADOR', text: 'ANO: 2009. O REI DO POP ESTÁ PRESO...', title: 'CAPÍTULO 1', showPortrait: false, bgFlash: true },
          { speaker: 'NARRADOR', text: 'DENTRO DAS PAREDES DA GRAVADORA SONY, JACKILSON É MANTIDO COMO PRISIONEIRO. FORÇADO A PRODUZIR MÚSICAS SEM DESCANSO.', showPortrait: false },
          { speaker: 'JACKILSON', text: 'EU PRECISO FUGIR DAQUI... ESSES AGENTES NÃO VÃO ME SEGURAR PARA SEMPRE!', showPortrait: true },
          { speaker: 'JACKILSON', text: 'MINHA MÚSICA É MINHA ARMA. CADA NOTA QUE EU CANTO TEM O PODER DE DERRUBAR ESSES CAPANGAS!', showPortrait: true },
          { speaker: 'NARRADOR', text: 'PARA ESCAPAR, JACKILSON PRECISA RECUPERAR SEUS 6 ÁLBUNS ROUBADOS E ENFRENTAR O CEO DA SONY.', showPortrait: false },
          { speaker: 'JACKILSON', text: 'VAMOS LÁ... WHO\'S BAD?', showPortrait: true, bgFlash: true }
        ]
      },
      'pre_level2': {
        slides: [
          { speaker: 'NARRADOR', text: 'COM O PRIMEIRO ÁLBUM RECUPERADO, JACKILSON AVANÇA PARA O ANDAR SEGUINTE...', title: 'CAPÍTULO 2', showPortrait: false, bgFlash: true },
          { speaker: 'JACKILSON', text: 'ESSE LUGAR ESTÁ CHEIO DE DISCOS ESPALHADOS... PRECISO RECOLHER TODOS!', showPortrait: true },
          { speaker: 'AGENTE SONY', text: 'ELE ESTÁ AVANÇANDO! ENVIEM MAIS REFORÇOS!', showPortrait: false },
          { speaker: 'JACKILSON', text: 'PODEM VIR... EU DANÇO ENQUANTO LUTO!', showPortrait: true }
        ]
      },
      'pre_level3': {
        slides: [
          { speaker: 'NARRADOR', text: 'O TERCEIRO ANDAR É UMA ARMADILHA MORTAL. O CHÃO QUEIMA COMO BRASAS...', title: 'CAPÍTULO 3', showPortrait: false, bgFlash: true },
          { speaker: 'JACKILSON', text: 'PRECISO SOBREVIVER POR 30 SEGUNDOS... O ELEVADOR ESTÁ CHEGANDO!', showPortrait: true },
          { speaker: 'AGENTE SONY', text: 'NÃO DEIXEM ELE CHEGAR AO ELEVADOR! ATAQUEM SEM PARAR!', showPortrait: false },
          { speaker: 'JACKILSON', text: 'MEUS PÉS SÃO MAIS RÁPIDOS QUE SUAS BALAS!', showPortrait: true }
        ]
      },
      'pre_level4': {
        slides: [
          { speaker: 'NARRADOR', text: 'O QUARTO ANDAR ESTÁ MERGULHADO EM ESCURIDÃO. UM ERRO SERÁ FATAL...', title: 'CAPÍTULO 4', showPortrait: false, bgFlash: true },
          { speaker: 'JACKILSON', text: 'UM GOLPE E EU ESTOU MORTO... PRECISO SER PERFEITO!', showPortrait: true },
          { speaker: 'NARRADOR', text: 'ELIMINE 15 AGENTES SEM TOMAR DANO. A PERFEIÇÃO É A ÚNICA OPÇÃO.', showPortrait: false },
          { speaker: 'JACKILSON', text: 'ESTE É O THRILLER... E EU SOU O PROTAGONISTA!', showPortrait: true }
        ]
      },
      'pre_level5': {
        slides: [
          { speaker: 'NARRADOR', text: 'O ÚLTIMO ANDAR ANTES DO COVIL DO CHEFE. O ÁLBUM ESTÁ ESCONDIDO...', title: 'CAPÍTULO 5', showPortrait: false, bgFlash: true },
          { speaker: 'JACKILSON', text: 'O ÁLBUM ESTÁ INVISÍVEL... PRECISO SENTIR SUA PRESENÇA!', showPortrait: true },
          { speaker: 'AGENTE SONY', text: 'ELE NUNCA VAI ENCONTRAR! ESTÁ PROTEGIDO PELA NOSSA TECNOLOGIA!', showPortrait: false },
          { speaker: 'JACKILSON', text: 'A MÚSICA GUIA MEUS PASSOS. EU VOU ENCONTRAR!', showPortrait: true }
        ]
      },
      'pre_dance': {
        slides: [
          { speaker: 'NARRADOR', text: 'ANTES DE ENFRENTAR O CEO, JACKILSON PRECISA PROVAR SEU RITMO...', title: 'DESAFIO DE DANÇA', showPortrait: false, bgFlash: true },
          { speaker: 'JACKILSON', text: 'DANÇAR É A MINHA ESSÊNCIA. NENHUMA GRAVADORA PODE TIRAR ISSO DE MIM!', showPortrait: true },
          { speaker: 'NARRADOR', text: 'ACERTE AS SETAS NO RITMO PARA CARREGAR SUA ENERGIA FINAL!', showPortrait: false },
          { speaker: 'JACKILSON', text: 'MOONWALK ATÉ A LIBERDADE!', showPortrait: true, bgFlash: true }
        ]
      },
      'boss_intro': {
        slides: [
          { speaker: 'NARRADOR', text: 'O CONFRONTO FINAL. O ESCRITÓRIO DO CEO DA SONY.', title: 'LUTA FINAL', showPortrait: false, bgFlash: true },
          { speaker: 'CEO SONY', text: 'AH, JACKILSON... VOCÊ CHEGOU LONGE. MAS AQUI TERMINA SUA JORNADA!', showPortrait: false },
          { speaker: 'CEO SONY', text: 'EU CONTROLO A INDÚSTRIA DA MÚSICA! VOCÊ É APENAS UMA PEÇA NO MEU TABULEIRO!', showPortrait: false },
          { speaker: 'JACKILSON', text: 'EU NÃO SOU SUA MARIONETE! A MÚSICA PERTENCE AO POVO!', showPortrait: true },
          { speaker: 'CEO SONY', text: 'ENTÃO VENHA... MOSTRE QUE É DIGNO DE SER CHAMADO DE REI DO POP!', showPortrait: false, bgFlash: true },
          { speaker: 'JACKILSON', text: 'COM PRAZER... THIS IS IT!', showPortrait: true, bgFlash: true }
        ]
      },
      'victory': {
        slides: [
          { speaker: 'NARRADOR', text: 'O CEO DA SONY CAI DERROTADO. AS CORRENTES SE ROMPEM...', title: 'LIBERDADE', showPortrait: false, bgFlash: true },
          { speaker: 'JACKILSON', text: 'ACABOU... EU FINALMENTE SOU LIVRE!', showPortrait: true },
          { speaker: 'NARRADOR', text: 'COM TODOS OS 6 ÁLBUNS RECUPERADOS, JACKILSON RECONQUISTA SUA ARTE.', showPortrait: false },
          { speaker: 'JACKILSON', text: 'A MÚSICA NUNCA MORRE. O REI DO POP VIVE PARA SEMPRE!', showPortrait: true },
          { speaker: 'NARRADOR', text: 'E ASSIM, SOB AS LUZES DE NEON, O GROOVER DANÇOU SUA ÚLTIMA MOONWALK... RUMO À LIBERDADE.', showPortrait: false, bgFlash: true },
          { speaker: 'JACKILSON', text: 'HEEHEE!', showPortrait: true, bgFlash: true }
        ]
      }
    };
    return cutscenes[this.cutsceneId] || cutscenes['intro'];
  }

  _showSlide(index) {
    if (index >= this.slides.length) {
      this._endCutscene();
      return;
    }

    this.currentSlide = index;
    const slide = this.slides[index];
    const { width, height } = this.cameras.main;

    // Title flash
    if (slide.title) {
      this.titleText.setText(slide.title);
      this.tweens.add({
        targets: this.titleText,
        alpha: { from: 0, to: 1 },
        duration: 600,
        ease: 'Power2'
      });
    } else {
      this.tweens.add({
        targets: this.titleText,
        alpha: 0,
        duration: 300
      });
    }

    // Background flash effect
    if (slide.bgFlash) {
      const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0.3).setDepth(49);
      this.tweens.add({
        targets: flash, alpha: 0, duration: 600,
        onComplete: () => flash.destroy()
      });
      this.cameras.main.shake(200, 0.008);
    }

    // Portrait
    if (slide.showPortrait) {
      this.tweens.add({
        targets: this.portraitImage,
        alpha: 1,
        x: width * 0.15,
        duration: 400,
        ease: 'Back.easeOut'
      });
      // Draw portrait frame
      this.portraitFrame.clear();
      this.portraitFrame.lineStyle(3, 0x00ffcc, 1);
      this.portraitFrame.strokeRect(width * 0.15 - 85, height * 0.45 - 85, 170, 170);
    } else {
      this.tweens.add({
        targets: this.portraitImage,
        alpha: 0,
        duration: 300
      });
      this.portraitFrame.clear();
    }

    // Speaker name with color coding
    const speakerColors = {
      'JACKILSON': '#ffcc00',
      'NARRADOR': '#aaaaaa',
      'AGENTE SONY': '#ff4444',
      'CEO SONY': '#ff0000'
    };
    this.speakerText.setColor(speakerColors[slide.speaker] || '#ffffff');
    this.speakerText.setText(slide.speaker);
    this.speakerText.setAlpha(1);

    // Typewriter effect
    this.dialogueText.setAlpha(1);
    this.dialogueText.setText('');
    this.isTyping = true;

    let charIndex = 0;
    const fullText = slide.text;

    if (this.typingTimer) this.typingTimer.remove();
    this.typingTimer = this.time.addEvent({
      delay: 25,
      callback: () => {
        charIndex++;
        this.dialogueText.setText(fullText.substring(0, charIndex));
        if (charIndex >= fullText.length) {
          this.isTyping = false;
        }
      },
      repeat: fullText.length - 1
    });
  }

  _advance() {
    if (this.isTyping) {
      // Complete typing instantly
      if (this.typingTimer) this.typingTimer.remove();
      const slide = this.slides[this.currentSlide];
      this.dialogueText.setText(slide.text);
      this.isTyping = false;
    } else {
      // Next slide
      this._showSlide(this.currentSlide + 1);
    }
  }

  _endCutscene() {
    this.cameras.main.fadeOut(800, 0, 0, 0);
    this.time.delayedCall(800, () => {
      this.scene.start(this.nextScene, this.nextData);
    });
  }
}
