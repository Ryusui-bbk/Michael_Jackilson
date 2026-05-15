import Phaser from "phaser";
import { bootMusic } from '../utils/BootMusic.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    const { width, height } = this.cameras.main;

    // ── Styled loading screen background ──
    const bg = this.add.graphics();
    for (let y = 0; y < height; y++) {
      const t = y / height;
      const r = Math.floor(8 + t * 30);
      const gr = Math.floor(3 + t * 4);
      const b = Math.floor(3 + t * 4);
      bg.fillStyle(Phaser.Display.Color.GetColor(r, gr, b));
      bg.fillRect(0, y, width, 1);
    }

    // ── Logo / Title ──
    this.add.text(width / 2, height * 0.28, 'NEON', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '22px',
      color: '#ffcc00',
      stroke: '#442200',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.38, 'GROOVER', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '32px',
      color: '#ffcc00',
      stroke: '#442200',
      strokeThickness: 5,
      shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 0, fill: true },
    }).setOrigin(0.5);

    // ── Progress bar container ──
    const barW = width * 0.6;
    const barH = 18;
    const barX = (width - barW) / 2;
    const barY = height * 0.62;

    // Track
    const track = this.add.graphics();
    track.fillStyle(0x111111);
    track.fillRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 4);
    track.lineStyle(2, 0x444444);
    track.strokeRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 4);

    // Fill bar
    const bar = this.add.graphics();

    // Status text
    const statusTxt = this.add.text(width / 2, height * 0.72, 'Carregando músicas... 0%', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // ── Progress listener ──
    this.load.on('progress', (v) => {
      bar.clear();
      // Gradient fill: gold → red
      const fillW = barW * v;
      bar.fillStyle(0xffcc00);
      bar.fillRoundedRect(barX, barY, fillW, barH, 3);
      // Shine strip
      bar.fillStyle(0xffffff, 0.25);
      bar.fillRoundedRect(barX, barY, fillW, barH / 2, 3);

      statusTxt.setText(`Carregando músicas... ${Math.floor(v * 100)}%`);
    });

    // ── Play fanfare once (on first user gesture or immediate) ──
    this.load.on('start', () => {
      bootMusic.play();
    });

    // ── Pulsing note decorations ──
    const noteColors = [0xffcc00, 0xff4444, 0x4488ff, 0xffffff];
    for (let i = 0; i < 8; i++) {
      const nx = Phaser.Math.Between(20, width - 20);
      const ny = Phaser.Math.Between(20, height - 20);
      const col = noteColors[i % noteColors.length];
      const dot = this.add.circle(nx, ny, Phaser.Math.Between(2, 5), col, 0.3);
      this.tweens.add({
        targets: dot,
        alpha: { from: 0.1, to: 0.5 },
        y: dot.y - Phaser.Math.Between(20, 50),
        duration: Phaser.Math.Between(1500, 3000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1000),
      });
    }

    // Audio assets
    this.load.audio('music-speed', 'assets/music/smooth_bandit.mp3');
    this.load.audio('music-hard',  'assets/music/chiller.mp3');
    this.load.audio('music-tank',  'assets/music/bop_it.mp3');
    this.load.audio('music-bad',   'assets/music/bad.mp3');
    this.load.audio('sfx-whos-bad', 'assets/music/whos_bad.mp3');
    
    // UI Assets
    this.load.image('portrait-mj', 'assets/ui/portrait_mj.png');
  }

  create() {
    this.generateTileset();
    this.generateDancerSkins();
    this.generateAgent();
    this.generateAlbums();
    this.generateUI();
    this.generateNote();
    this.generateParticle();
    this.createAnimations();
    const { width, height } = this.cameras.main;
    const startTxt = this.add.text(width / 2, height * 0.85, 'CLIQUE PARA INICIAR', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Blink text
    this.tweens.add({
      targets: startTxt,
      alpha: { from: 1, to: 0.2 },
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    this.input.once('pointerdown', () => {
      // Resume audio context if locked
      if (this.sys.game.sound.context.state === 'suspended') {
        this.sys.game.sound.context.resume();
      }
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => this.scene.start('MenuScene'));
    });
  }

  // ─── low-level helpers ───────────────────────────────────────────────────────
  _px(ctx, x, y, color, s=1) { ctx.fillStyle=color; ctx.fillRect(x*s, y*s, s, s); }
  _rect(ctx, x, y, w, h, color, s=1) { ctx.fillStyle=color; ctx.fillRect(x*s, y*s, w*s, h*s); }

  _makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  _mirrorCanvas(src) {
    const c = this._makeCanvas(src.width, src.height);
    const ctx = c.getContext('2d');
    ctx.translate(src.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0);
    return c;
  }

  _reg(key, canvas) { 
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addImage(key, canvas); 
  }


  // ─── Dancer character drawing ────────────────────────────────────────────────────

  /**
   * Draws Dancer on ctx at pixel scale s.
   * skin: 'sc' (Speed), 'bi' (Tank), 'th' (Hard)
   * frame: 0=idle, 1-3=walk frames, 4=sing (microphone), 5=death
   */
  _drawDancer(ctx, skin, frame) {
    const s = 1, W = 32, H = 28;
    ctx.clearRect(0, 0, W, H);

    // ── SKIN PALETTES ──
    const SKIN='#c8845a', SKINS='#a06040', EYE='#111111';
    const SHOE='#111111', SHOES='#2a2a2a';
    const MIC_BODY='#888888', MIC_HEAD='#cccccc', MIC_WIRE='#555555';

    // per-skin colors
    let HAT1, HAT2, HAIR1, HAIR2, TOP1, TOP2, LEG1, LEG2, DETAIL;
    if (skin === 'sc') {
      // Speed: cream/white fedora + cream suit + white pants
      HAT1='#f0ece0'; HAT2='#ccc8a8';
      HAIR1=null; HAIR2=null;
      TOP1='#e0d898'; TOP2='#bfaf6a'; // cream jacket
      LEG1='#f0eee0'; LEG2='#d0cebb'; // white pants
      DETAIL='#ddaa00'; // gold belt
    } else if (skin === 'bi') {
      // Tank: curly black hair + red leather jacket + black jeans
      HAT1=null; HAT2=null;
      HAIR1='#111111'; HAIR2='#333333';
      TOP1='#cc2222'; TOP2='#991111'; // red jacket
      LEG1='#111111'; LEG2='#222222'; // black jeans
      DETAIL='#aaaaaa'; // silver zippers
    } else {
      // Hard: curly black hair + red/black jacket + red pants
      HAT1=null; HAT2=null;
      HAIR1='#111111'; HAIR2='#333333';
      TOP1='#cc2222'; TOP2='#991111'; // red jacket
      LEG1='#cc2222'; LEG2='#991111'; // red pants
      DETAIL='#111111'; // black accents
    }

    // ── HEAD / HAIR / HAT ──
    if (skin === 'sc') {
      // White fedora
      this._rect(ctx,12,1,8,1,HAT1,s);   // top
      this._rect(ctx,11,2,10,3,HAT1,s);  // crown
      this._rect(ctx,11,2,10,3,HAT2,s);  // shadow inside crown (override center)
      this._rect(ctx,12,2,8,3,'#e8e4cc',s);
      this._rect(ctx,11,5,10,1,HAT1,s);  // crown base
      this._rect(ctx, 7,6,18,1,HAT1,s);  // wide brim
    } else {
      // Curly hair
      this._rect(ctx,12,1,8,1,HAIR1,s);
      this._rect(ctx,10,2,12,2,HAIR1,s);
      this._rect(ctx, 9,3,14,2,HAIR1,s);
      // hair highlights
      this._px(ctx,13,2,HAIR2,s); this._px(ctx,16,2,HAIR2,s); this._px(ctx,19,2,HAIR2,s);
      this._px(ctx,11,3,HAIR2,s); this._px(ctx,14,3,HAIR2,s); this._px(ctx,18,3,HAIR2,s);
    }

    // ── FACE ──
    const faceY = skin==='sc' ? 7 : 5;
    this._rect(ctx,10,faceY,12,5,SKIN,s);
    this._rect(ctx,11,faceY,10,5,SKIN,s);
    // eye whites
    this._rect(ctx,12,faceY+1,2,1,'#eeeeee',s);
    this._rect(ctx,16,faceY+1,2,1,'#eeeeee',s);
    // pupils
    this._px(ctx,13,faceY+1,EYE,s); this._px(ctx,17,faceY+1,EYE,s);
    // nose
    this._px(ctx,15,faceY+3,SKINS,s);
    // lips (dark)
    this._rect(ctx,13,faceY+4,5,1,'#883322',s);

    // ── COLLAR / NECK ──
    const neckY = faceY+5;
    if (skin==='sc') {
      this._rect(ctx,13,neckY,6,1,'#7090cc',s); // blue shirt
    } else if (skin==='bi') {
      this._rect(ctx,13,neckY,6,1,'#444466',s); // dark collar
    } else {
      this._rect(ctx,13,neckY,6,1,'#111111',s); // black collar
    }

    // ── TORSO ──
    const torsoY = neckY+1;
    // main jacket body
    this._rect(ctx, 8,torsoY,16,6,TOP1,s);
    // shadow sides
    this._rect(ctx, 8,torsoY,2,6,TOP2,s);
    this._rect(ctx,22,torsoY,2,6,TOP2,s);

    if (skin==='sc') {
      // cream jacket lapels (dark center stripe = blue shirt showing)
      this._rect(ctx,14,torsoY,4,5,'#7090cc',s); // shirt visible between lapels
      this._rect(ctx,12,torsoY,2,5,TOP2,s); // left lapel shadow
      this._rect(ctx,18,torsoY,2,5,TOP2,s);
      // glove (white left hand)
      this._rect(ctx, 7,torsoY+2,2,2,'#f8f8f8',s);
      // belt
      this._rect(ctx, 9,torsoY+5,14,1,DETAIL,s);
    } else if (skin==='bi') {
      // red jacket - silver zipper lines
      this._rect(ctx,13,torsoY,1,6,DETAIL,s); // center zipper
      this._rect(ctx,18,torsoY,1,6,DETAIL,s); // right zipper
      this._rect(ctx,10,torsoY,1,6,DETAIL,s); // sleeve zipper left
      this._rect(ctx,21,torsoY,1,6,DETAIL,s); // sleeve zipper right
      // white stripes on sleeves
      this._rect(ctx, 8,torsoY,1,6,'#eeeeee',s);
      this._rect(ctx,23,torsoY,1,6,'#eeeeee',s);
    } else {
      // Hard: black collar + shoulder blacks
      this._rect(ctx, 8,torsoY,2,2,'#111111',s);   // black left shoulder
      this._rect(ctx,22,torsoY,2,2,'#111111',s);   // black right shoulder
      this._rect(ctx,10,torsoY+2,12,1,'#111111',s);// black chest stripe
      this._rect(ctx,12,torsoY,2,2,'#111111',s);   // left lapel black
      this._rect(ctx,18,torsoY,2,2,'#111111',s);   // right lapel black
    }

    // ── LEGS ──
    const legY = torsoY+6;
    const legH = 6;
    // base legs
    this._rect(ctx,10,legY,5,legH,LEG1,s);
    this._rect(ctx,17,legY,5,legH,LEG1,s);
    this._rect(ctx,10,legY,1,legH,LEG2,s);
    this._rect(ctx,21,legY,1,legH,LEG2,s);

    // ── WALK FRAMES — foot positions ──
    if (frame===0 || frame===4 || frame===5) {
      // neutral
    } else if (frame===1) {
      // moonwalk: left leg slides forward (drawn lower), right leg on ball
      this._rect(ctx,10,legY+1,5,legH-1,LEG1,s); // left leg shifted down slightly
      this._rect(ctx,17,legY-1,5,legH+1,LEG1,s); // right leg up on ball
      this._px(ctx,21,legY+legH,SHOE,s); this._px(ctx,22,legY+legH,SHOE,s); // right tiptoe
    } else if (frame===2) {
      // crossing
      this._rect(ctx,11,legY,4,legH,LEG1,s);
      this._rect(ctx,16,legY,4,legH,LEG1,s);
    } else if (frame===3) {
      // other side
      this._rect(ctx,10,legY-1,5,legH+1,LEG1,s);
      this._rect(ctx,17,legY+1,5,legH-1,LEG1,s);
      this._px(ctx,10,legY+legH,SHOE,s); this._px(ctx,11,legY+legH,SHOE,s);
    }

    // ── SHOES ──
    const shoeY = legY+legH;
    this._rect(ctx, 9,shoeY,7,1,SHOE,s);
    this._rect(ctx,16,shoeY,7,1,SHOE,s);
    this._px(ctx,10,shoeY,SHOES,s);
    this._px(ctx,19,shoeY,SHOES,s);

    // ── MICROPHONE (sing frame) ──
    if (frame===4) {
      // mic held up to face — right side
      this._rect(ctx,22,faceY,3,1,MIC_HEAD,s);   // mic capsule
      this._rect(ctx,22,faceY,3,1,'#999999',s);
      this._rect(ctx,23,faceY+1,1,1,MIC_BODY,s); // handle
      this._rect(ctx,23,faceY+2,1,1,MIC_BODY,s);
      this._rect(ctx,23,faceY+3,1,1,MIC_WIRE,s); // wire
      // extended arm
      this._rect(ctx,22,torsoY+1,2,2,SKIN,s);
    }

    // ── DEATH FRAME (5): lying sideways ──
    // Already handled by the tween in Player.js (spin+shrink), no special frame needed
  }

  // ─── Generate all Dancer skins ────────────────────────────────────────────────────
  generateDancerSkins() {
    const skinMap = { speed:'sc', hard:'th', tank:'bi' };
    const dirs = ['down','up','left'];

    Object.entries(skinMap).forEach(([mode, skin]) => {
      // walk frames 0-3 + sing frame(4)
      for (let f = 0; f <= 4; f++) {
        const c = this._makeCanvas(32, 28);
        this._drawDancer(c.getContext('2d'), skin, f);

        if (f < 4) {
          dirs.forEach(d => this._reg(`dancer-${mode}-${d}-${f}`, c));
          this._reg(`dancer-${mode}-right-${f}`, this._mirrorCanvas(c));
        } else {
          dirs.forEach(d => this._reg(`dancer-${mode}-sing-${d}`, c));
          this._reg(`dancer-${mode}-sing-right`, this._mirrorCanvas(c));
        }
      }
      // death = frame 0 tinted (tween handles the rest)
      const dc = this._makeCanvas(32, 28);
      this._drawDancer(dc.getContext('2d'), skin, 0);
      this._reg(`dancer-${mode}-death-0`, dc);
      this._reg(`dancer-${mode}-death-1`, dc);
    });

    // Legacy keys → use speed skin (fallback for any old references)
    for (let f = 0; f < 4; f++) {
      let mirrorCanvas = null;
      dirs.forEach(d => {
        const c = this._makeCanvas(32,28); this._drawDancer(c.getContext('2d'),'sc',f);
        this._reg(`dancer-${d}-${f}`, c);
        if (!mirrorCanvas) mirrorCanvas = this._mirrorCanvas(c);
      });
      this._reg(`dancer-right-${f}`, mirrorCanvas);
    }
    dirs.forEach(d => {
      const c = this._makeCanvas(32,28); this._drawDancer(c.getContext('2d'),'sc',4);
      this._reg(`dancer-sing-${d}`, c);
    });
    const rc = this._makeCanvas(32,28); this._drawDancer(rc.getContext('2d'),'sc',4);
    this._reg('dancer-sing-right', this._mirrorCanvas(rc));
  }

  // ─── TILESET ─────────────────────────────────────────────────────────────────
  generateTileset() {
    this._drawSolidTile('tile-grass', '#1a1a1a', (ctx,s)=>{ ctx.fillStyle='#111111'; ctx.fillRect(0,0,16*s,s); ctx.fillRect(0,0,s,16*s); });
    this._drawSolidTile('tile-grass2','#222222', (ctx,s)=>{ ctx.fillStyle='#1a1a1a'; ctx.fillRect(4*s,4*s,s,s); });
    this._drawSolidTile('tile-road',  '#550000', (ctx,s)=>{ ctx.fillStyle='#770000'; ctx.fillRect(0,0,16*s,s); });
    const P={ '.':null,'B':'#111111','b':'#222222','L':'#00ff00','R':'#ff0000','G':'#444444' };
    this._texParse('tile-tree',['................','..GGGGGGGGGGGG..', '.GBBBBBBBBBBBBG.','.GBLLBBBBBBBRBG.','.GBBBBBBBBBBBBG.','..GGGGGGGGGGGG..'],P,2);
  }

  _drawSolidTile(key, base, fn) {
    const s=2, c=this._makeCanvas(32,32);
    const ctx=c.getContext('2d'); ctx.fillStyle=base; ctx.fillRect(0,0,32,32);
    if(fn) fn(ctx,s); this._reg(key,c);
  }

  _texParse(key, lines, palette, scale = 1) {
    const rows = lines.map(r => r.split('').map(ch => palette[ch] || null));
    const h = rows.length;
    const w = rows[0].length;
    const c = this._makeCanvas(w * scale, h * scale);
    const ctx = c.getContext('2d');
    
    rows.forEach((row, r) => {
      row.forEach((col, cc) => {
        if (col) {
          ctx.fillStyle = col;
          ctx.fillRect(cc * scale, r * scale, scale, scale);
        }
      });
    });
    this._reg(key, c);
  }


  // ─── AGENT ───────────────────────────────────────────────────────────────────
  generateAgent() {
    const P={'.':null,'S':'#ffcc99','B':'#111111','G':'#000000','W':'#ffffff','K':'#000000','L':'#3333aa'};
    const a0=['................................','............BBBBBBBB............','...........BBBBBBBBBB...........','..........BBBBBBBBBBBB..........','..........BBSSSSSSSSBB..........','..........BBGGSSSSGGBB..........','..........BBSSSSSSSSBB..........','..........BBSSSSSSSSBB..........','...........BBSSSSSSBB...........','............WWWWWWWW............','..........BBBWWLLWWBBB..........', '.........BBBBWWWWWWBBBB.........','........BBBBBBWWWWBBBBBB........','........BBBBBBBBBBBBBBBB........','........BBBBBBBBBBBBBBBB........','........BBBBBBBBBBBBBBBB........','........BBBBBBBBBBBBBBBB........','........BBBBBBBBBBBBBBBB........','.........BBBBBBBBBBBBBB.........','.........BBBBBBBBBBBBBB.........','..........BBBBBBBBBBBB..........','..........BBBB....BBBB..........','..........BBBB....BBBB..........','..........BBBB....BBBB..........','..........KKKK....KKKK..........','.........KKKKKK..KKKKKK.........'];
    const a1=[...a0]; a1[21]='..........BBBB......BBBB........'; a1[22]='.........BBBB........BBBB.......'; a1[24]='.........KKKK........KKKK.......';
    ['down','up','left'].forEach(d=>{ this._texParse(`agent-${d}-0`,a0,P); this._texParse(`agent-${d}-1`,a1,P); });
    this._texParse('agent-right-0', a0.map(r=>[...r].reverse().join('')), P);
    this._texParse('agent-right-1', a1.map(r=>[...r].reverse().join('')), P);
  }

  // ─── ALBUMS ──────────────────────────────────────────────────────────────────
  generateAlbums() {
    const P={'.':null,'K':'#111111','W':'#ffffff','G':'#888888','R':'#cc0000','B':'#0000cc','Y':'#ffcc00','S':'#e0ac69','s':'#c68e4c','D':'#333333','L':'#4444ff','g':'#cccccc','b':'#885522'};
    const mk=(key,rows)=>this._texParse(key,rows,P);

    const f=(n,ch)=>Array(n).fill(ch);
    const otw=f(32,'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'); for(let i=8;i<32;i++) otw[i]='bbbbbbbbbKKKKKKKKKKKKbbbbbbbbbbb'; otw[10]='bbbbbbbbbbWWWWWWWWWWbbbbbbbbbbbb'; mk('album-0',otw);
    const th=f(32,'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK'); for(let i=12;i<28;i++) th[i]='KKKKKWWWWWWWWWWWWWWWWWWWWKKKKKKK'; mk('album-1',th);
    const bad=f(32,'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'); for(let i=0;i<32;i++) bad[i]='KKKKKKKKKKKKKKKKK'+bad[i].substring(17); bad[10]='KKKKKKKKKKKKKKKKKRRRRRRRRRRWWWWW'; bad[11]='KKKKKKKKKKKKKKKKKRRWWWWWWWWWWWWW'; bad[12]='KKKKKKKKKKKKKKKKKRRRRRRRRRRWWWWW'; mk('album-2',bad);
    const dng=f(32,'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY'); for(let i=4;i<28;i++) dng[i]='YYYYYKKKKKKKKKKKKKKKKKKKYYYYY'; dng[14]='YYYYYKKKKKKKEEKKKKKEEKKKKKYYYYY'; mk('album-3',dng);
    const xsc=f(32,'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD'); for(let i=14;i<24;i++) xsc[i]='DDDDDDDDgggggggggggggggDDDDDDDDD'; mk('album-4',xsc);
    const inv=f(32,'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'); for(let i=10;i<22;i++) inv[i]='WWWWWWWWWWWWggggggggWWWWWWWWWWWW'; mk('album-5',inv);
  }

  // ─── UI ──────────────────────────────────────────────────────────────────────
  generateUI() {
    const P = { '.': null, 'R': '#ee2244', 'r': '#ff6677' };
    this._texParse('heart-v2', ['.rr..rr.', 'RRRRRRRR', 'RRRRRRRR', '.RRRRRR.', '..RRRR...', '...RR...'], P, 3);
    this._texParse('heart-empty-v2', ['.rr..rr.', '........', '........', '........', '........', '........'], P, 3);
    const I = { '.': null, 'Y': '#ffcc00', 'K': '#111111' };
    this._texParse('album-v2', ['..YYYY..', '.YKKKKY.', 'YKYYYYKY', 'YKYYYYKY', '.YKKKKY.', '..YYYY..'], I, 4);
  }




  // ─── NOTE ────────────────────────────────────────────────────────────────────
  generateNote() {
    const P={'.':null,'B':'#111111','W':'#ffffff', 'w':'#dddddd'};
    this._texParse('note',['..BBB.', '.BwwB.', '.BwwB.', '..BBB.', '....BB', '....BB'],P,4);
    const sc=this._makeCanvas(16,8); const sctx=sc.getContext('2d');
    sctx.fillStyle='rgba(0,0,0,0.3)'; sctx.beginPath(); sctx.ellipse(8,4,6,3,0,0,Math.PI*2); sctx.fill();
    this._reg('note-shadow',sc);
  }

  // ─── PARTICLES ───────────────────────────────────────────────────────────────
  generateParticle() {
    const mk=(key,color,w,h)=>{ const c=this._makeCanvas(w,h); c.getContext('2d').fillStyle=color; c.getContext('2d').fillRect(0,0,w,h); this._reg(key,c); };
    mk('particle',      '#ffcc00',4,4);
    mk('particle-note', '#ffffff', 6,6);
  }

  // ─── ANIMATIONS ──────────────────────────────────────────────────────────────
  createAnimations() {
    const dirs=['down','up','left','right'];
    const modes=['speed','hard','tank'];

    modes.forEach(m => {
      dirs.forEach(d => {
        // Walk: 4 frames at 10fps — moonwalk slide effect
        this.anims.create({ key:`dancer-${m}-walk-${d}`,  frames:[0,1,2,3].map(i=>({key:`dancer-${m}-${d}-${i}`})), frameRate:10, repeat:-1 });
        this.anims.create({ key:`dancer-${m}-idle-${d}`,  frames:[{key:`dancer-${m}-${d}-0`}], frameRate:1, repeat:-1 });
        this.anims.create({ key:`dancer-${m}-sing-${d}`,  frames:[{key:`dancer-${m}-sing-${d}`},{key:`dancer-${m}-${d}-0`}], frameRate:6, repeat:0 });
      });
      this.anims.create({ key:`dancer-${m}-death`, frames:[{key:`dancer-${m}-death-0`},{key:`dancer-${m}-death-1`}], frameRate:6, repeat:3 });

      // Rhythmic Dance Animation: cycles through directions for a "fancy" look
      this.anims.create({
        key: `dancer-${m}-dance`,
        frames: [
          { key: `dancer-${m}-down-0` },
          { key: `dancer-${m}-left-1` },
          { key: `dancer-${m}-up-0` },
          { key: `dancer-${m}-right-1` },
          { key: `dancer-${m}-sing-down` }
        ],
        frameRate: 12,
        repeat: -1
      });
    });


    // Legacy anims (fallback)
    dirs.forEach(d => {
      this.anims.create({ key:`dancer-walk-${d}`,  frames:[0,1,2,3].map(i=>({key:`dancer-${d}-${i}`})), frameRate:10, repeat:-1 });
      this.anims.create({ key:`dancer-idle-${d}`,  frames:[{key:`dancer-${d}-0`}], frameRate:1, repeat:-1 });
      this.anims.create({ key:`dancer-sing-${d}`,  frames:[{key:`dancer-sing-${d}`}], frameRate:1, repeat:-1 });
      this.anims.create({ key:`agent-walk-${d}`, frames:[{key:`agent-${d}-0`},{key:`agent-${d}-1`}], frameRate:6, repeat:-1 });
      this.anims.create({ key:`agent-idle-${d}`, frames:[{key:`agent-${d}-0`}], frameRate:1, repeat:-1 });
    });
  }
}
