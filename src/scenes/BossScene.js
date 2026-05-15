import Phaser from "phaser";
import { CONFIG } from '../config/constants.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Album } from '../objects/Album.js';
import { Note } from '../objects/Note.js';
import { HUD } from '../ui/HUD.js';
import { DialogueBox } from '../ui/DialogueBox.js';
import { music } from '../utils/MusicManager.js';
import { sfx } from '../utils/SFXManager.js';

export class BossScene extends Phaser.Scene {
  constructor() { super('BossScene'); }

  init(data) {
    this.mode = data.mode || 'speed';
    this.albumsCollected = data.albums || 5;
    this.isGameOver = false;
    this.bossDefeated = false;
    this.bossPhase = 1; // Boss has 3 phases
  }

  create() {
    this.cameras.main.fadeIn(1000, 255, 255, 255);

    const cx = 640; 
    const cy = 360;
    const ringSize = 600;
    this.ringSize = ringSize;
    this.ringCX = cx;
    this.ringCY = cy;
    const startX = cx - ringSize / 2;
    const startY = cy - ringSize / 2;

    // Store arena bounds for clamping
    this.arenaMinX = startX + 20;
    this.arenaMinY = startY + 20;
    this.arenaMaxX = startX + ringSize - 20;
    this.arenaMaxY = startY + ringSize - 20;

    // Background and Arena
    this.bgGraphics = this.add.graphics().setDepth(0);
    this.bgGraphics.fillGradientStyle(0x220000, 0x220000, 0x000000, 0x000000, 1);
    this.bgGraphics.fillRect(0, 0, 1280, 720);
    
    // The Ring (Exactly in the middle)
    this.ringRect = this.add.rectangle(cx, cy, ringSize, ringSize, 0x440000, 0.5).setStrokeStyle(6, 0xff0000);

    // Arena border walls (invisible colliders to prevent knockback escape)
    this.arenaBounds = this.physics.add.staticGroup();
    const wallThickness = 30;
    // Top wall
    this.arenaBounds.add(this.add.rectangle(cx, startY - wallThickness / 2, ringSize + wallThickness * 2, wallThickness, 0x000000, 0).setOrigin(0.5));
    // Bottom wall
    this.arenaBounds.add(this.add.rectangle(cx, startY + ringSize + wallThickness / 2, ringSize + wallThickness * 2, wallThickness, 0x000000, 0).setOrigin(0.5));
    // Left wall
    this.arenaBounds.add(this.add.rectangle(startX - wallThickness / 2, cy, wallThickness, ringSize + wallThickness * 2, 0x000000, 0).setOrigin(0.5));
    // Right wall
    this.arenaBounds.add(this.add.rectangle(startX + ringSize + wallThickness / 2, cy, wallThickness, ringSize + wallThickness * 2, 0x000000, 0).setOrigin(0.5));
    this.arenaBounds.getChildren().forEach(wall => {
      wall.setVisible(false);
      wall.refreshBody();
    });

    this.player = new Player(this, cx, cy + 200, this.mode);
    this.player.sfx = sfx;

    // NO camera follow to keep it centered
    this.cameras.main.centerOn(cx, cy);
    this.cameras.main.setBounds(0, 0, 1280, 720);
    
    // STRICT physics world bounds
    this.physics.world.setBounds(startX, startY, ringSize, ringSize);
    this.player.setCollideWorldBounds(true);

    this.enemies = this.physics.add.group();
    this.albums = this.physics.add.group();
    this.notes = this.physics.add.group();

    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.enemies, this.arenaBounds); // Boss collides with arena walls
    this.physics.add.collider(this.player, this.arenaBounds);
    this.physics.add.overlap(this.player, this.enemies, this._onPlayerHitEnemy, null, this);
    this.physics.add.overlap(this.player, this.albums, this._onCollectAlbum, null, this);
    this.physics.add.overlap(this.notes, this.enemies, this._onNoteHitEnemy, this._noteHitProcess, this);

    this.hud = new HUD(this);
    const songNames = { speed: 'Smooth Bandit', hard: 'Chiller', tank: 'Bop It' };
    this.hud.setup(this.player.maxHp, songNames[this.mode] || 'Smooth Bandit');
    this.hud.updateHealth(this.player.hp, this.player.maxHp);
    this.hud.updateAlbums(this.albumsCollected);
    this.hud.updateObjective('Luta Final: Derrote o Chefe da Sony!');

    // Boss HP bar
    this._createBossHPBar();

    // Spawn Boss
    this.boss = new Enemy(this, cx, cy - 200);
    this.boss.setScale(3); 
    this.boss.hp = CONFIG.BOSS_HP; 
    this.boss.maxHp = CONFIG.BOSS_HP;
    this.boss.speed = CONFIG.ENEMY_SPEED * CONFIG.BOSS_SPEED_MULT;
    this.boss.setTint(0xffaa00);
    this.boss.isBoss = true;
    
    // Fix Boss Physics Body to match Scale and enforce bounds
    this.boss.body.setSize(24, 24);
    this.boss.body.setOffset(4, 4);
    this.boss.setCollideWorldBounds(true);
    this.boss.body.setBounce(0); // No bounce — stops at walls
    this.enemies.add(this.boss);

    // Boss Name Tag
    this.bossName = this.add.text(cx, cy - 140, 'AGENTE SONY (CEO)', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ff0000',
      stroke: '#ffffff',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(20);

    // Dialogue Box
    this.dialogueBox = new DialogueBox(this);
    
    // --- KEYBOARD LISTENERS ---
    this.input.keyboard.on('keydown-SPACE', () => {
        if (this.dialogueBox.visible) {
            this.dialogueBox.handleInput();
            if (!this.dialogueBox.visible) {
                this.physics.world.resume();
                if (this.player) this.player.active = true;
            }
        }
    });

    this.input.keyboard.on('keydown-P', () => {
        if (!this.dialogueBox.visible && !this.isGameOver) {
            this.scene.pause();
            this.scene.launch('PauseScene', { parentScene: 'BossScene' });
        }
    });

    // Boss Confrontation Dialogue
    this.time.delayedCall(1500, () => {
        this.physics.world.pause();
        if (this.player) this.player.active = false;
        this.dialogueBox.startDialogue([
            "JACKILSON: EU QUERO SAIR!",
            "CEO SONY: NÃO VOU DEIXAR QUE VOCÊ SAIA, JACKILSON! MUAHAHAHA!",
            "CEO SONY: VOCÊ VAI PAGAR POR TER CHEGADO ATÉ AQUI!",
            "JACKILSON: THIS IS IT... VAMOS ACABAR COM ISSO!"
        ]);
    });

    // Minion spawner
    this.time.addEvent({
      delay: CONFIG.BOSS_MINION_DELAY,
      callback: this._spawnMinions,
      callbackScope: this,
      loop: true
    });

    // Boss attack pattern timer
    this.bossAttackTimer = this.time.addEvent({
      delay: 2500,
      callback: this._bossAttackPattern,
      callbackScope: this,
      loop: true
    });
  }

  _createBossHPBar() {
    const cx = this.ringCX;
    const startY = this.ringCY - this.ringSize / 2;
    
    this.bossHPBarBg = this.add.rectangle(cx, startY - 30, 400, 16, 0x111111)
      .setStrokeStyle(2, 0x444444).setDepth(20);
    this.bossHPBarFill = this.add.rectangle(cx - 198, startY - 30, 396, 12, 0xff0000)
      .setOrigin(0, 0.5).setDepth(21);
    this.bossHPText = this.add.text(cx, startY - 30, 'CEO SONY', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(22);
  }

  _updateBossHPBar() {
    if (!this.boss || !this.boss.active || this.boss.isDead) {
      if (this.bossHPBarBg) this.bossHPBarBg.setVisible(false);
      if (this.bossHPBarFill) this.bossHPBarFill.setVisible(false);
      if (this.bossHPText) this.bossHPText.setVisible(false);
      return;
    }
    const ratio = Math.max(0, this.boss.hp / this.boss.maxHp);
    this.bossHPBarFill.width = 396 * ratio;
    
    // Color changes based on HP
    if (ratio > 0.5) this.bossHPBarFill.setFillStyle(0xff0000);
    else if (ratio > 0.25) this.bossHPBarFill.setFillStyle(0xff6600);
    else this.bossHPBarFill.setFillStyle(0xffcc00);
  }

  _bossAttackPattern() {
    if (this.isGameOver || this.bossDefeated || !this.boss || !this.boss.active || this.boss.isDead) return;
    
    const hpRatio = this.boss.hp / this.boss.maxHp;

    // Phase transitions
    if (hpRatio <= 0.6 && this.bossPhase === 1) {
      this.bossPhase = 2;
      this.boss.speed = CONFIG.ENEMY_SPEED * CONFIG.BOSS_SPEED_MULT * 1.3;
      this.boss.setTint(0xff6600);
      this.cameras.main.shake(300, 0.015);
      
      // Phase 2 dialogue
      this.physics.world.pause();
      if (this.player) this.player.active = false;
      this.dialogueBox.startDialogue([
        "CEO SONY: VOCÉ ACHA QUE PODE ME DERROTAR?! AGORA EU FICO MAIS FORTE!",
        "JACKILSON: CONTINUE TENTANDO... EU NÃO VOU PARAR!"
      ]);

      this.hud.updateObjective('Fase 2: O CEO está furioso!');
    }
    else if (hpRatio <= 0.25 && this.bossPhase === 2) {
      this.bossPhase = 3;
      this.boss.speed = CONFIG.ENEMY_SPEED * CONFIG.BOSS_SPEED_MULT * 1.6;
      this.boss.setTint(0xff0000);
      this.cameras.main.shake(500, 0.025);
      
      // Phase 3 dialogue
      this.physics.world.pause();
      if (this.player) this.player.active = false;
      this.dialogueBox.startDialogue([
        "CEO SONY: IMPOSSÍVEL! EU SOU O DONO DA INDÚSTRIA!!!",
        "JACKILSON: A MÚSICA É DO POVO! VOCÊ PERDEU!"
      ]);

      this.hud.updateObjective('Fase 3: Último suspiro do CEO!');
    }

    // Boss dash attack in phase 2+
    if (this.bossPhase >= 2 && this.player && !this.player.isDead) {
      const angle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
      const dashSpeed = 350 + (this.bossPhase === 3 ? 150 : 0);
      this.boss.setVelocity(
        Math.cos(angle) * dashSpeed,
        Math.sin(angle) * dashSpeed
      );
      this.time.delayedCall(400, () => {
        if (this.boss && this.boss.active && !this.boss.isDead) {
          this.boss.setVelocity(0, 0);
        }
      });
    }
  }

  _clampBossToArena() {
    if (!this.boss || !this.boss.active || this.boss.isDead) return;
    
    // Clamp boss position to arena bounds
    const bx = Phaser.Math.Clamp(this.boss.x, this.arenaMinX, this.arenaMaxX);
    const by = Phaser.Math.Clamp(this.boss.y, this.arenaMinY, this.arenaMaxY);
    
    if (bx !== this.boss.x || by !== this.boss.y) {
      this.boss.setPosition(bx, by);
      this.boss.setVelocity(0, 0);
    }
  }

  _spawnMinions() {
    if (this.isGameOver || this.bossDefeated || !this.boss.active) return;
    
    const cx = this.ringCX;
    const cy = this.ringCY;
    const minionCount = CONFIG.BOSS_MINION_COUNT + (this.bossPhase - 1); // More in later phases
    
    for (let i = 0; i < minionCount; i++) {
      // Spawn at ring edges
      const angle = (i / minionCount) * Math.PI * 2;
      const spawnX = cx + Math.cos(angle) * (this.ringSize / 2 - 40);
      const spawnY = cy + Math.sin(angle) * (this.ringSize / 2 - 40);
      const minion = new Enemy(this, spawnX, spawnY);
      minion.setTint(0x8888ff);
      minion.hp = CONFIG.ENEMY_HP + this.bossPhase; // Minions get tougher
      minion.speed = CONFIG.ENEMY_SPEED * (1 + this.bossPhase * 0.15);
      minion.setCollideWorldBounds(true);
      this.enemies.add(minion);
    }
  }

  update(time, delta) {
    if (this.player) this.player.update();
    
    // ALWAYS clamp boss to arena — prevents knockback escape
    this._clampBossToArena();
    
    // Also clamp all minions
    this.enemies.getChildren().forEach(enemy => {
      if (enemy.active && !enemy.isDead) {
        const ex = Phaser.Math.Clamp(enemy.x, this.arenaMinX, this.arenaMaxX);
        const ey = Phaser.Math.Clamp(enemy.y, this.arenaMinY, this.arenaMaxY);
        if (ex !== enemy.x || ey !== enemy.y) {
          enemy.setPosition(ex, ey);
          enemy.setVelocity(0, 0);
        }
      }
    });

    if (this.boss && this.boss.active) {
      this.bossName.setPosition(this.boss.x, this.boss.y - 40);
    } else {
      this.bossName.setVisible(false);
    }

    this._updateBossHPBar();

    this.enemies.getChildren().forEach(enemy => {
      if (enemy.active) {
        enemy.update(time, delta, this.player);
      }
    });
  }

  _onPlayerHitEnemy(player, enemy) {
    if (enemy.isDead || player.isDead || player.invulnerable) return;
    let damage = CONFIG.ENEMY_DAMAGE;
    if (enemy === this.boss) damage *= CONFIG.BOSS_DAMAGE_MULT;
    if (this.bossPhase >= 3 && enemy === this.boss) damage += 1; // Extra damage in phase 3
    player.takeDamage(damage, enemy);
  }

  _noteHitProcess(note, enemy) {
    return note.active && !note.hasSplatted && !enemy.isDead;
  }

  _onNoteHitEnemy(note, enemy) {
    if (!note.active || note.hasSplatted || enemy.isDead) return;
    note.hasSplatted = true;
    
    const hitAngle = Phaser.Math.Angle.Between(note.x, note.y, enemy.x, enemy.y);
    
    // Reduced knockback for boss to prevent pushing out
    const knockbackForce = enemy === this.boss ? 120 : 300;
    enemy.setVelocity(Math.cos(hitAngle) * knockbackForce, Math.sin(hitAngle) * knockbackForce);
    this.time.delayedCall(150, () => { 
      if(enemy.active && !enemy.isDead) {
        enemy.setVelocity(0, 0);
        // Extra clamp after knockback settles
        if (enemy === this.boss) this._clampBossToArena();
      }
    });

    let dmg = note.damage;
    enemy.takeDamage(dmg, this.player);
    
    if (this.mode === 'hard' && !note.isRicochet) {
      let nearest = null;
      let minDist = 300; 
      this.enemies.getChildren().forEach(e => {
         if (e !== enemy && e.active && !e.isDead) {
            const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, e.x, e.y);
            if (dist < minDist) {
               minDist = dist;
               nearest = e;
            }
         }
      });
      if (nearest) {
         const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, nearest.x, nearest.y);
         const ricochetNote = new Note(this, enemy.x, enemy.y);
         ricochetNote.isRicochet = true;
         this.notes.add(ricochetNote);
         ricochetNote.fire(Math.cos(angle), Math.sin(angle), 0, 0);
      }
    }

    sfx.noteHit();
    note.splat();

    if (enemy === this.boss && enemy.hp <= 0 && !this.bossDefeated) {
      this.bossDefeated = true;
      this.hud.updateObjective('Chefe Derrotado! Pegue o Último Álbum!');
      
      // Kill all minions
      this.enemies.getChildren().forEach(e => {
        if (e !== this.boss) e.takeDamage(100, this.player);
      });

      this.spawnAlbum(this.boss.x, this.boss.y);
    }
  }

  _onCollectAlbum(player, album) {
    if (player.isDead) return;
    album.collect();
    player.collectAlbum();
    this.albumsCollected++;
    
    this.isGameOver = true;
    music.stop();
    
    // Victory cutscene
    this.cameras.main.fadeOut(800, 255, 255, 255);
    this.time.delayedCall(800, () => {
      this.scene.start('CutsceneScene', {
        cutsceneId: 'victory',
        mode: this.mode,
        albums: this.albumsCollected,
        nextScene: 'GameOverScene',
        nextData: { won: true, albums: this.albumsCollected }
      });
    });
  }

  spawnAlbum(x, y) {
    const album = new Album(this, x, y, this.albumsCollected);
    this.albums.add(album);
  }

  spawnNote(x, y, dirX, dirY, vx, vy) {
    const note = new Note(this, x, y);
    this.notes.add(note);
    note.fire(dirX, dirY, vx, vy);
  }
}
