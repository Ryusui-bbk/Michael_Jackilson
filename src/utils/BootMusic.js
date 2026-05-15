import Phaser from "phaser";
/**
 * BootMusic — Jingle chiptune tocado na tela de loading.
 * Fanfarra épica de ~4 segundos, Web Audio API puro.
 */
export class BootMusic {
  constructor() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.ctx = null;
    }
    this._nodes = [];
    this._masterGain = null;
  }

  _osc(type, freq, start, dur, vol, detune = 0) {
    if (!this.ctx || !this._masterGain) return;
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.015);
    g.gain.setValueAtTime(vol, start + dur * 0.65);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    if (detune) osc.detune.value = detune;
    osc.connect(g);
    g.connect(this._masterGain);
    osc.start(start);
    osc.stop(start + dur + 0.02);
    this._nodes.push(osc, g);
  }

  _noise(start, dur, vol, ffreq = 200) {
    if (!this.ctx || !this._masterGain) return;
    const ctx = this.ctx;
    const bufSize = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = ffreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    src.connect(flt); flt.connect(g); g.connect(this._masterGain);
    src.start(start); src.stop(start + dur + 0.02);
    this._nodes.push(src, flt, g);
  }

  play() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const ctx = this.ctx;
    const now = ctx.currentTime + 0.05;

    this._masterGain = ctx.createGain();
    this._masterGain.gain.value = 0.25;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -15;
    comp.ratio.value = 5;
    comp.attack.value = 0.003;
    comp.release.value = 0.1;
    this._masterGain.connect(comp);
    comp.connect(ctx.destination);
    this._nodes.push(this._masterGain, comp);

    // ── Fanfarra épica de intro ──────────────────────────────────────────────
    // Ritmo base: 8vo @ 130bpm → beat = 0.46s
    const B = 60 / 130;

    // --- Melodia fanfarra (trumpet-like: square) ---
    // "Ta-da-DA-DA-daaaa!" em Dó maior
    const fanfare = [
      // pickup - call
      [0,        'square', 523, B*0.3],   // C5
      [B*0.35,   'square', 659, B*0.3],   // E5
      [B*0.7,    'square', 784, B*0.5],   // G5

      // resposta alta
      [B*1.3,    'square', 880, B*0.4],   // A5
      [B*1.75,   'square', 1047,B*0.8],   // C6 — pico!

      // descida resolvendo
      [B*2.65,   'square', 784, B*0.35],  // G5
      [B*3.0,    'square', 659, B*0.35],  // E5
      [B*3.35,   'square', 523, B*0.35],  // C5
      [B*3.7,    'square', 392, B*0.3],   // G4

      // acorde final longo
      [B*4.1,    'square', 523, B*1.4],   // C5
      [B*4.1,    'square', 659, B*1.4],   // E5 (harmonia simultânea)
      [B*4.1,    'square', 784, B*1.4],   // G5
    ];

    fanfare.forEach(([offset, type, freq, dur]) => {
      this._osc(type, freq, now + offset, dur, 0.30);
      this._osc('triangle', freq, now + offset, dur, 0.12, -5); // shimmer
    });

    // --- Baixo marcante (oitava abaixo) ---
    const bassNotes = [
      [0,      131, B*0.3],
      [B*0.35, 165, B*0.3],
      [B*0.7,  196, B*0.5],
      [B*1.3,  220, B*0.4],
      [B*1.75, 262, B*0.8],
      [B*2.65, 196, B*0.35],
      [B*3.0,  165, B*0.35],
      [B*3.35, 131, B*0.35],
      [B*3.7,   98, B*0.3],
      [B*4.1,  131, B*1.4],
    ];
    bassNotes.forEach(([offset, freq, dur]) => {
      this._osc('sawtooth', freq, now + offset, dur, 0.45);
    });

    // --- Percussão nos tempos principais ---
    const kicks = [0, B*2, B*4.1];
    kicks.forEach(offset => {
      this._noise(now + offset, 0.18, 0.65, 80);
      this._osc('sine', 60, now + offset, 0.18, 0.8);
    });
    const snares = [B, B*3];
    snares.forEach(offset => {
      this._noise(now + offset, 0.1, 0.35, 2000);
    });

    // --- Shimmer final ---
    [B*4.2, B*4.35, B*4.5, B*4.65].forEach((offset, i) => {
      this._osc('sine', 2093 * Math.pow(0.9, i), now + offset, 0.2, 0.15);
    });
  }

  stop() {
    this._nodes.forEach(n => {
      try { n.disconnect(); } catch (_) {}
      try { if (n.stop) n.stop(0); } catch (_) {}
    });
    this._nodes = [];
    this._masterGain = null;
  }
}

export const bootMusic = new BootMusic();
