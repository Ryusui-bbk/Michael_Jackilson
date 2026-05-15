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
import { menuMusic } from '../utils/MenuMusic.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data) {
    this.mode = data.mode || 'speed'; // speed / hard / tank
    this.level = data.level || 1; // 1 to 5
    this.albumsCollected = data.albums || 0;
    
    this.isGameOver = false;
    this.levelWon = false;
    this.albumSpawned = false;
    
    // Level tracking vars
    this.enemiesKilled = 0;
    this.discsCollected = 0;
    this.timeLeft = 0;

    menuMusic.stop();
    music.setScene(this);
    music.playMode(this.mode);
  }

  create() {
    this.cameras.main.fadeIn(600, 0, 0, 0);

    this._buildMap();

    const cx = (CONFIG.MAP_COLS * CONFIG.TILE_SIZE) / 2;
    const cy = (CONFIG.MAP_ROWS * CONFIG.TILE_SIZE) / 2;
    this.player = new Player(this, cx, cy, this.mode);
    this.player.sfx = sfx;

    this._applyModeModifiers();

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, CONFIG.MAP_COLS * CONFIG.TILE_SIZE, CONFIG.MAP_ROWS * CONFIG.TILE_SIZE);

    this.physics.add.collider(this.player, this.obstacleGroup);

    this.player.invulnerable = true;
    this.time.delayedCall(1500, () => {
      if (this.player) this.player.invulnerable = false;
    });

    this.enemies = this.physics.add.group();
    this.albums = this.physics.add.group();
    this.notes = this.physics.add.group();
    this.discs = this.physics.add.group(); // for level 2

    this.physics.add.collider(this.enemies, this.obstacleGroup);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player, this.enemies, this._onPlayerHitEnemy, null, this);
    this.physics.add.overlap(this.player, this.albums, this._onCollectAlbum, null, this);
    this.physics.add.overlap(this.player, this.discs, this._onCollectDisc, null, this);
    this.physics.add.overlap(this.notes, this.enemies, this._onNoteHitEnemy, this._noteHitProcess, this);
    this.physics.add.collider(this.notes, this.obstacleGroup, this._onNoteHitObstacle, null, this);

    this.hud = new HUD(this);
    const songNames = { speed: 'Smooth Bandit', hard: 'Chiller', tank: 'Bop It' };
    this.hud.setup(this.player.maxHp, songNames[this.mode] || 'Smooth Bandit');
    this.hud.updateHealth(this.player.hp, this.player.maxHp);
    this.hud.updateAlbums(this.albumsCollected);

    this.physics.world.setBounds(0, 0, CONFIG.MAP_COLS * CONFIG.TILE_SIZE, CONFIG.MAP_ROWS * CONFIG.TILE_SIZE);
    this.player.setCollideWorldBounds(true);

    this.dialogueBox = new DialogueBox(this);
    this.input.keyboard.on('keydown-SPACE', () => {
        if (this.dialogueBox.visible) {
            const handled = this.dialogueBox.handleInput();
            if (!this.dialogueBox.visible) {
                this.physics.world.resume();
                if (this.player) this.player.active = true;
            }
        }
    });

    this.input.keyboard.on('keydown-P', () => {
        if (!this.dialogueBox.visible && !this.isGameOver) {
            this.scene.pause();
            this.scene.launch('PauseScene', { parentScene: 'GameScene' });
        }
    });


    this._setupLevel();
  }

  _setupLevel() {
    this.hud.updateObjective("");

    // Scale difficulty per level
    const levelEnemyCount = CONFIG.ENEMY_COUNT + (this.level - 1) * 3;

    if (this.level === 1) {
      this.targetKills = 12; // Increased from 10
      this.hud.updateObjective(`Fase 1: Elimine ${this.targetKills} Agentes`);
      this._spawnEnemies(levelEnemyCount);
      
      // Trigger dialogue
      this.time.delayedCall(1000, () => {
          this.physics.world.pause();
          if (this.player) this.player.active = false;
          this.dialogueBox.startDialogue([
            "QUERO FUGIR DESSA GRAVADORA DIABÓLICA!",
            "OS AGENTES ESTÃO POR TODA PARTE... PRECISO DERRUBAR TODOS!"
          ]);
      });
    } 
    else if (this.level === 2) {
      this.targetDiscs = 12; // Increased from 10
      this.hud.updateObjective(`Fase 2: Colete ${this.targetDiscs} Discos`);
      this._spawnEnemies(levelEnemyCount);
      this._spawnDiscs(this.targetDiscs);

      this.time.delayedCall(1000, () => {
          this.physics.world.pause();
          if (this.player) this.player.active = false;
          this.dialogueBox.startDialogue([
            "ESSES DISCOS ESTÃO ESPALHADOS POR TODO O ANDAR...",
            "PRECISO RECOLHER TODOS ENQUANTO ME DEFENDO DOS AGENTES!"
          ]);
      });
    }
    else if (this.level === 3) {
      this.timeLeft = 35; // Increased from 30
      this.hud.updateObjective(`Fase 3: Sobreviva por ${this.timeLeft}s`);
      this.time.addEvent({
        delay: 1000,
        callback: this._onTimerTick,
        callbackScope: this,
        loop: true
      });
      this._spawnEnemies(levelEnemyCount + 4); // Extra enemies for survival

      this.time.delayedCall(1000, () => {
          this.physics.world.pause();
          if (this.player) this.player.active = false;
          this.dialogueBox.startDialogue([
            "O CHÃO ESTÁ QUEIMANDO... PRECISO AGUENTAR ATÉ O ELEVADOR CHEGAR!",
            "NÃO POSSO PARAR DE ME MOVER!"
          ]);
      });
    }
    else if (this.level === 4) {
      this.targetKills = 18; // Increased from 15
      this.player.maxHp = 2; // 1 Hit KO effectively
      this.player.hp = 2;
      this.hud.updateHealth(this.player.hp, this.player.maxHp);
      this.hud.updateObjective(`Fase 4: Elimine ${this.targetKills} s/ tomar dano`);
      this._spawnEnemies(levelEnemyCount);

      this.time.delayedCall(1000, () => {
          this.physics.world.pause();
          if (this.player) this.player.active = false;
          this.dialogueBox.startDialogue([
            "ESSE ANDAR É PERIGOSO... UM ERRO E EU ESTOU MORTO!",
            "PRECISO SER PERFEITO COMO O THRILLER!"
          ]);
      });
    }
    else if (this.level === 5) {
      this.hud.updateObjective(`Fase 5: Encontre o Álbum Invisível`);
      this._spawnEnemies(levelEnemyCount + 6); // Many more enemies

      // Level 5 Dialogue
      this.time.delayedCall(1000, () => {
          this.physics.world.pause();
          if (this.player) this.player.active = false;
          this.dialogueBox.startDialogue([
            "SINTO QUE ESTOU CHEGANDO PERTO DO COVIL DELES...",
            "O ÁLBUM ESTÁ ESCONDIDO... PRECISO SENTIR SUA PRESENÇA!",
            "O CHEFE FINAL DEVE ESTAR POR PERTO. NÃO POSSO DESISTIR AGORA!"
          ]);
      });
      // Spawn album immediately but invisible
      const ax = Phaser.Math.Between(100, CONFIG.MAP_COLS * CONFIG.TILE_SIZE - 100);
      const ay = Phaser.Math.Between(100, CONFIG.MAP_ROWS * CONFIG.TILE_SIZE - 100);
      this.spawnAlbum(ax, ay);
      const album = this.albums.getChildren()[0];
      if (album) album.setAlpha(0);
    }
    
    this._createLevelAtmosphere();

    // Escalating enemy spawn during gameplay
    if (this.level >= 3) {
      this.time.addEvent({
        delay: 8000,
        callback: () => {
          if (!this.isGameOver && !this.levelWon) {
            this._spawnEnemies(2 + Math.floor(this.level / 2));
          }
        },
        callbackScope: this,
        loop: true
      });
    }
  }

  _spawnDiscs(count) {
    const ts = CONFIG.TILE_SIZE;
    for (let i = 0; i < count; i++) {
      let c = Phaser.Math.Between(2, CONFIG.MAP_COLS - 3);
      let r = Phaser.Math.Between(2, CONFIG.MAP_ROWS - 3);
      const disc = this.add.circle(c * ts + ts / 2, r * ts + ts / 2, 6, 0xffff00);
      this.physics.add.existing(disc);
      this.discs.add(disc);
    }
  }

  _createLevelAtmosphere() {
    const { width, height } = this.cameras.main;
    const mapW = CONFIG.MAP_COLS * CONFIG.TILE_SIZE;
    const mapH = CONFIG.MAP_ROWS * CONFIG.TILE_SIZE;

    if (this.level === 2) {
      // Level 2: Cyber Blue Fog
      const emitter = this.add.particles(0, 0, 'particle', {
        x: { min: 0, max: mapW },
        y: { min: 0, max: mapH },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.3, end: 0 },
        tint: 0x00ffff,
        frequency: 50,
        lifespan: 2000,
      });
      emitter.setDepth(1);
    } 
    else if (this.level === 3) {
      // Level 3: Heat/Embers
      const emitter = this.add.particles(0, 0, 'particle', {
        x: { min: 0, max: mapW },
        y: { min: 0, max: mapH },
        speedY: { min: -50, max: -100 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.6, end: 0 },
        tint: 0xff4400,
        frequency: 30,
        lifespan: 3000,
      });
      emitter.setDepth(10); // Above player
    }
    else if (this.level === 4) {
      // Level 4: Neon Glitch Void
      for (let i = 0; i < 20; i++) {
        const x = Phaser.Math.Between(0, mapW);
        const y = Phaser.Math.Between(0, mapH);
        const line = this.add.rectangle(x, y, Phaser.Math.Between(50, 150), 1, 0xff00ff, 0.3);
        line.setDepth(1);
        this.tweens.add({
          targets: line,
          alpha: 0,
          duration: 500,
          yoyo: true,
          repeat: -1,
          delay: Phaser.Math.Between(0, 2000)
        });
      }
    }
  }

  _onTimerTick() {
    if (this.isGameOver || this.levelWon) return;
    if (this.level === 3) {
      this.timeLeft--;
      this.hud.updateObjective(`Fase 3: Sobreviva por ${this.timeLeft}s`);
      
      // Spawn extra enemies more frequently
      if (this.timeLeft % 4 === 0) {
        this._spawnEnemies(3);
      }

      if (this.timeLeft <= 0) {
        this.levelWon = true;
        this.hud.updateObjective(`Fase 3: Álbum Liberado!`);
        this.spawnAlbum(this.player.x, this.player.y - 40);
      }
    }
  }

  _onCollectDisc(player, disc) {
    if (player.isDead) return;
    disc.destroy();
    this.discsCollected++;
    this.hud.updateObjective(`Fase 2: Colete ${this.targetDiscs - this.discsCollected} Discos`);
    sfx.collectAlbum(); // reuse sound
    
    if (this.discsCollected >= this.targetDiscs && !this.albumSpawned) {
      this.levelWon = true;
      this.albumSpawned = true;
      this.hud.updateObjective(`Fase 2: Álbum Liberado!`);
      this.spawnAlbum(this.player.x, this.player.y - 40);
    }
  }

  _applyModeModifiers() {
    if (this.mode === 'speed') {
      this.player.speed = CONFIG.PLAYER_SPEED * 1.5;
    } else if (this.mode === 'tank') {
      this.player.maxHp = 12;
      this.player.hp = 12;
    }
  }

  update(time, delta) {
    if (this.player) this.player.update();
    this.enemies.getChildren().forEach(enemy => {
      if (enemy.active) {
        // Per-level speed scaling
        let speedMult = 1 + (this.level - 1) * 0.12; // Each level 12% faster
        if (this.level === 4 || this.level === 5) speedMult += 0.2;
        
        // Temporarily modify speed for enemy update
        const baseSpeed = enemy.speed;
        enemy.speed = baseSpeed * speedMult;
        enemy.update(time, delta, this.player);
        enemy.speed = baseSpeed;
      }
    });

    if (this.level === 5 && !this.levelWon) {
      const album = this.albums.getChildren()[0];
      if (album && this.player) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, album.x, album.y);
        if (dist < 60) {
          album.setAlpha(1);
          this.hud.updateObjective(`Fase 5: Álbum Encontrado!`);
          this.levelWon = true;
        } else {
          album.setAlpha(0);
        }
      }
    }
  }

  _buildMap() {
    const ts = CONFIG.TILE_SIZE;
    const cols = CONFIG.MAP_COLS;
    const rows = CONFIG.MAP_ROWS;
    
    const levelTints = {
      1: 0xffffff,
      2: 0x88ccff,
      3: 0xffaa88,
      4: 0xcc88ff,
      5: 0xffffff
    };
    const tint = levelTints[this.level] || 0xffffff;

    const { width, height } = this.cameras.main;
    const viewWidth = Math.max(width, cols * ts);
    const viewHeight = Math.max(height, rows * ts);


    // Cover the entire potential view area
    for (let r = -5; r < (viewHeight / ts) + 5; r++) {
      for (let c = -5; c < (viewWidth / ts) + 5; c++) {
        const x = c * ts + ts / 2;
        const y = r * ts + ts / 2;
        const isRoad = this._isRoad(c, r, cols, rows);
        const texKey = isRoad ? 'tile-road' : ((c + r) % 7 === 0 ? 'tile-grass2' : 'tile-grass');
        const img = this.add.image(x, y, texKey).setDepth(0);
        if (tint !== 0xffffff) img.setTint(tint);
      }
    }

    this.obstacleGroup = this.physics.add.staticGroup();
    this._placeObstacles(cols, rows, ts, tint);
  }

  _isRoad(c, r, cols, rows) {
    const midR = Math.floor(rows / 2);
    const midC = Math.floor(cols / 2);
    return (r >= midR - 1 && r <= midR + 1) || (c >= midC - 1 && c <= midC + 1);
  }

  _placeObstacles(cols, rows, ts, tint) {
    // More obstacles at higher levels
    const obstacleCount = 40 + (this.level - 1) * 8;
    for (let i = 0; i < obstacleCount; i++) {
      const c = Phaser.Math.Between(2, cols - 3);
      const r = Phaser.Math.Between(2, rows - 3);
      if (!this._isRoad(c, r, cols, rows)) {
        const tree = this.obstacleGroup.create(c * ts + ts / 2, r * ts + ts / 2, 'tile-tree');
        tree.setDepth(8).body.setSize(16, 12).setOffset(8, 18);
        if (tint && tint !== 0xffffff) tree.setTint(tint);
        tree.refreshBody();
      }
    }
  }

  _spawnEnemies(count) {
    const ts = CONFIG.TILE_SIZE;
    for (let i = 0; i < count; i++) {
      let c = Phaser.Math.Between(5, CONFIG.MAP_COLS - 5);
      let r = Phaser.Math.Between(5, CONFIG.MAP_ROWS - 5);
      if (!this._isRoad(c, r, CONFIG.MAP_COLS, CONFIG.MAP_ROWS)) {
        const enemy = new Enemy(this, c * ts + ts / 2, r * ts + ts / 2);
        // Level-based enemy HP scaling
        enemy.hp = CONFIG.ENEMY_HP + Math.floor(this.level * 0.5);
        this.enemies.add(enemy);
      }
    }
  }

  _onPlayerHitEnemy(player, enemy) {
    if (enemy.isDead || player.isDead || player.invulnerable) return;
    let damage = CONFIG.ENEMY_DAMAGE;
    if (this.mode === 'hard') damage *= 2;
    // Level-based damage scaling
    if (this.level >= 4) damage += 1;
    player.takeDamage(damage, enemy);
  }

  _noteHitProcess(note, enemy) {
    return note.active && !note.hasSplatted && !enemy.isDead;
  }

  _onNoteHitEnemy(note, enemy) {
    if (!note.active || note.hasSplatted || enemy.isDead) return;
    note.hasSplatted = true;
    
    const hitAngle = Phaser.Math.Angle.Between(note.x, note.y, enemy.x, enemy.y);
    
    if (this.level === 2) {
      enemy.x += Math.cos(hitAngle) * 50;
      enemy.y += Math.sin(hitAngle) * 50;
    } else {
      enemy.setVelocity(Math.cos(hitAngle) * 300, Math.sin(hitAngle) * 300);
      this.time.delayedCall(200, () => { if(enemy.active && !enemy.isDead) enemy.setVelocity(0,0); });

      let dmg = note.damage;
      enemy.takeDamage(dmg, this.player);
    }
    
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
  }

  _onNoteHitObstacle(note) {
    if (!note.active || note.hasSplatted) return;
    note.hasSplatted = true;
    note.splat();
  }

  _onCollectAlbum(player, album) {
    if (player.isDead) return;
    if (album.alpha === 0) return; // Cannot collect invisible album

    album.collect();
    player.collectAlbum();
    this.albumsCollected++;
    
    // Transition via cutscenes
    this.isGameOver = true;
    
    this.cameras.main.fadeOut(800, 0, 0, 0);
    this.time.delayedCall(800, () => {
      switch(this.albumsCollected) {
        case 1:
          this.scene.start('CutsceneScene', {
            cutsceneId: 'pre_level2',
            mode: this.mode,
            albums: this.albumsCollected,
            nextScene: 'GameScene',
            nextData: { mode: this.mode, level: 2, albums: this.albumsCollected }
          });
          break;
        case 2:
          this.scene.start('CutsceneScene', {
            cutsceneId: 'pre_level3',
            mode: this.mode,
            albums: this.albumsCollected,
            nextScene: 'GameScene',
            nextData: { mode: this.mode, level: 3, albums: this.albumsCollected }
          });
          break;
        case 3:
          this.scene.start('CutsceneScene', {
            cutsceneId: 'pre_level4',
            mode: this.mode,
            albums: this.albumsCollected,
            nextScene: 'GameScene',
            nextData: { mode: this.mode, level: 4, albums: this.albumsCollected }
          });
          break;
        case 4:
          this.scene.start('CutsceneScene', {
            cutsceneId: 'pre_dance',
            mode: this.mode,
            albums: this.albumsCollected,
            nextScene: 'DanceScene',
            nextData: { mode: this.mode, albums: this.albumsCollected }
          });
          break;
        case 5:
          this.scene.start('CutsceneScene', {
            cutsceneId: 'boss_intro',
            mode: this.mode,
            albums: this.albumsCollected,
            nextScene: 'BossScene',
            nextData: { mode: this.mode, albums: this.albumsCollected }
          });
          break;
        case 6:
          music.stop();
          this.scene.start('GameOverScene', { won: true, albums: this.albumsCollected });
          break;
      }
    });
  }

  onEnemyDied(x, y) {
    this.enemiesKilled++;
    sfx.enemyDie();
    
    // Check level goals
    if (this.level === 1 && !this.albumSpawned) {
      this.hud.updateObjective(`Fase 1: Elimine ${Math.max(0, this.targetKills - this.enemiesKilled)} Agentes`);
      if (this.enemiesKilled >= this.targetKills) {
        this.levelWon = true;
        this.albumSpawned = true;
        this.hud.updateObjective(`Fase 1: Álbum Liberado!`);
        this.spawnAlbum(x, y);
      }
    }
    else if (this.level === 4 && !this.albumSpawned) {
      this.hud.updateObjective(`Fase 4: Elimine ${Math.max(0, this.targetKills - this.enemiesKilled)} s/ tomar dano`);
      if (this.enemiesKilled >= this.targetKills) {
        this.levelWon = true;
        this.albumSpawned = true;
        this.hud.updateObjective(`Fase 4: Álbum Liberado!`);
        this.spawnAlbum(x, y);
      }
    }
    
    // Respawn to keep map populated in some levels
    if (this.level === 3 || this.level === 4 || this.level === 5) {
      this.time.delayedCall(800, () => {
        if (!this.isGameOver) this._spawnEnemies(1);
      });
    }
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
