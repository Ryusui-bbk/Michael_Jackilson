import Phaser from "phaser";
/**
 * SFXManager — Efeitos sonoros gerados via Web Audio API.
 * Completamente independente do sistema de música (não usa Phaser.Sound).
 */
export class SFXManager {
  constructor() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.ctx = null;
    }
    this.enabled = !!this.ctx;
    this._masterVolume = 0.35;
  }

  _resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _playTone({ type = 'sine', freq = 440, endFreq = null, duration = 0.15, volume = 1.0, delay = 0, distortion = false }) {
    if (!this.enabled) return;
    this._resume();

    const ctx = this.ctx;
    const now = ctx.currentTime + delay;
    const vol = volume * this._masterVolume;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    let source;
    if (distortion) {
      // White noise burst
      const bufSize = ctx.sampleRate * duration;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      source = ctx.createBufferSource();
      source.buffer = buf;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = 0.8;
      source.connect(filter);
      filter.connect(gain);
    } else {
      source = ctx.createOscillator();
      source.type = type;
      source.frequency.setValueAtTime(freq, now);
      if (endFreq !== null) {
        source.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
      }
      source.connect(gain);
    }

    gain.connect(ctx.destination);
    source.start(now);
    source.stop(now + duration);
  }

  /** Disparo de nota musical — beep ascendente curto */
  shoot() {
    this._playTone({ type: 'square', freq: 520, endFreq: 880, duration: 0.08, volume: 0.5 });
    this._playTone({ type: 'sine', freq: 660, endFreq: 1100, duration: 0.12, volume: 0.3, delay: 0.02 });
  }

  /** Nota acertando inimigo — impacto com ruído */
  noteHit() {
    this._playTone({ freq: 900, duration: 0.06, volume: 0.6, distortion: true });
    this._playTone({ type: 'sine', freq: 200, endFreq: 80, duration: 0.1, volume: 0.4 });
  }

  /** Inimigo morre — "schlorp" descendente */
  enemyDie() {
    this._playTone({ type: 'sawtooth', freq: 380, endFreq: 60, duration: 0.25, volume: 0.55 });
    this._playTone({ freq: 300, duration: 0.15, volume: 0.5, distortion: true, delay: 0.05 });
  }

  /** Player toma dano — impacto grave */
  playerHit() {
    this._playTone({ type: 'square', freq: 140, endFreq: 80, duration: 0.2, volume: 0.7 });
    this._playTone({ freq: 180, duration: 0.18, volume: 0.5, distortion: true });
  }

  /** Player morre — tom dramático longo */
  playerDie() {
    // Descida épica de 3 tons
    this._playTone({ type: 'sine', freq: 660, endFreq: 110, duration: 0.8, volume: 0.8 });
    this._playTone({ type: 'sine', freq: 440, endFreq: 73,  duration: 1.0, volume: 0.6, delay: 0.1 });
    this._playTone({ type: 'sawtooth', freq: 220, endFreq: 55, duration: 1.2, volume: 0.4, delay: 0.2 });
  }

  /** Coletar álbum — jingle ascendente alegre */
  collectAlbum() {
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      this._playTone({ type: 'sine', freq, endFreq: freq * 1.02, duration: 0.14, volume: 0.6, delay: i * 0.1 });
      this._playTone({ type: 'triangle', freq: freq * 2, duration: 0.08, volume: 0.2, delay: i * 0.1 });
    });
  }
}

export const sfx = new SFXManager();
