import Phaser from "phaser";
/** Game-wide constants for easy tuning */
export const CONFIG = {
  // Display
  GAME_WIDTH: 800,
  GAME_HEIGHT: 600,
  TILE_SIZE: 32,
  MAP_COLS: 50,
  MAP_ROWS: 40,

  // Player
  PLAYER_SPEED: 150,
  PLAYER_MAX_HP: 6,          // 3 hearts × 2 HP each
  PLAYER_INVULN_MS: 800,     // reduced invulnerability after hit
  FIRE_RATE: 400,            // slightly slower fire rate
  NOTE_DAMAGE: 2,
  NOTE_SPEED: 280,
  NOTE_LIFETIME: 1400,       // ms before note destroys itself

  // Enemy
  ENEMY_SPEED: 90,           // faster enemies
  ENEMY_HP: 5,               // more HP
  ENEMY_DAMAGE: 2,           // 1 heart of damage
  CHASE_RADIUS: 200,         // larger chase radius
  WANDER_INTERVAL: 2000,     // more frequent wander changes
  KNOCKBACK_FORCE: 180,
  KNOCKBACK_DURATION: 130,
  ENEMY_COUNT: 14,           // more enemies per level
  RESPAWN_DELAY: 5000,       // faster respawn

  // Emerald
  EMERALD_FLOAT_SPEED: 1500,
  EMERALD_FLOAT_AMOUNT: 4,

  // Boss
  BOSS_HP: 60,               // boss HP
  BOSS_SPEED_MULT: 1.5,      // boss speed multiplier
  BOSS_DAMAGE_MULT: 2,       // boss damage multiplier
  BOSS_MINION_DELAY: 3000,   // minion spawn delay
  BOSS_MINION_COUNT: 3,      // minions per wave
};
