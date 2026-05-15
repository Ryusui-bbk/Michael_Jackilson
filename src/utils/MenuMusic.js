import Phaser from "phaser";
/**
 * MenuMusic — Música de menu gerada proceduralmente via Web Audio API.
 * Estilo chiptune dramático e épico, com baixo pulsante e melodia sintética.
 */
export class MenuMusic {
  constructor() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.ctx = null;
    }
    this._nodes = [];
    this._running = false;
    this._scheduledIds = [];
    this._masterGain = null;
    this._bpm = 112;
    this._beat = (60 / this._bpm); // seconds per beat
  }

  _resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  /** Cria oscilador com envelope ADSR simples */
  _osc(type, freq, start, dur, vol, detune = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.01);
    g.gain.setValueAtTime(vol, start + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    if (detune) osc.detune.value = detune;
    osc.connect(g);
    g.connect(this._masterGain);
    osc.start(start);
    osc.stop(start + dur + 0.01);
    this._nodes.push(osc, g);
  }

  /** Noise percussivo para kick/snare */
  _noise(start, dur, vol, filterFreq = 200, filterType = 'lowpass') {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const bufSize = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const flt = ctx.createBiquadFilter();
    flt.type = filterType;
    flt.frequency.value = filterFreq;

    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);

    src.connect(flt);
    flt.connect(g);
    g.connect(this._masterGain);
    src.start(start);
    src.stop(start + dur + 0.01);
    this._nodes.push(src, flt, g);
  }

  play() {
    if (!this.ctx || this._running) return;
    this._resume();
    this._running = true;

    // Master gain com compressor
    const ctx = this.ctx;
    this._masterGain = ctx.createGain();
    this._masterGain.gain.value = 0.22;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.005;
    comp.release.value = 0.15;
    this._masterGain.connect(comp);
    comp.connect(ctx.destination);
    this._nodes.push(this._masterGain, comp);

    this._scheduleLoop(ctx.currentTime);
  }

  _scheduleLoop(startTime) {
    if (!this._running) return;

    const B = this._beat;
    const BAR = B * 4;

    // ── Sequência de notas da melodia (escala menor dramática) ──
    // Base: A menor (A3=220, B3=247, C4=262, D4=294, E4=330, F4=349, G4=392, A4=440)
    const melody = [
      // bar 1 — tema principal
      [0,     'A4', 440,  B*0.8],
      [B,     'C5', 523,  B*0.4],
      [B*1.5, 'E4', 330,  B*0.4],
      [B*2,   'D4', 294,  B*0.8],
      [B*3,   'C4', 262,  B*0.8],
      // bar 2 — subida
      [BAR+0,     'E4', 330,  B*0.8],
      [BAR+B,     'G4', 392,  B*0.4],
      [BAR+B*1.5, 'A4', 440,  B*0.4],
      [BAR+B*2,   'B4', 494,  B*0.8],
      [BAR+B*3,   'A4', 440,  B],
      // bar 3 — tensão
      [BAR*2+0,     'G4', 392,  B*0.8],
      [BAR*2+B,     'F4', 349,  B*0.4],
      [BAR*2+B*1.5, 'E4', 330,  B*0.4],
      [BAR*2+B*2,   'D4', 294,  B*0.4],
      [BAR*2+B*2.5, 'C4', 262,  B*0.4],
      [BAR*2+B*3,   'B3', 247,  B],
      // bar 4 — resolução (queda)
      [BAR*3+0,   'A3', 220,  B*1.5],
      [BAR*3+B*2, 'E4', 330,  B*0.6],
      [BAR*3+B*3, 'A3', 220,  B],
    ];

    // ── Melodia (square wave, oitavas duplas) ──
    melody.forEach(([offset, , freq, dur]) => {
      this._osc('square', freq, startTime + offset, dur, 0.28);
      this._osc('square', freq * 2, startTime + offset, dur, 0.08, 5); // oitava acima levemente desafinada
    });

    // ── Baixo profundo (sawtooth, oitava abaixo) ──
    const bass = [
      [0,     110, B],
      [B,     110, B],
      [B*2,   98,  B],
      [B*3,   98,  B],
      [BAR,   110, B],
      [BAR+B, 147, B],
      [BAR+B*2, 165, B],
      [BAR+B*3, 110, B],
      [BAR*2,   98,  B],
      [BAR*2+B, 98,  B],
      [BAR*2+B*2, 87, B],
      [BAR*2+B*3, 87, B],
      [BAR*3,   55,  B*2],
      [BAR*3+B*2, 73, B],
      [BAR*3+B*3, 55, B],
    ];
    bass.forEach(([offset, freq, dur]) => {
      this._osc('sawtooth', freq, startTime + offset, dur * 0.85, 0.55);
    });

    // ── Arpejo de harmonia (triangle) ──
    const arp = [
      [0,       220, B*0.15],
      [B*0.25,  262, B*0.15],
      [B*0.5,   330, B*0.15],
      [B*0.75,  440, B*0.15],
      [BAR,     220, B*0.15],
      [BAR+B*0.25, 294, B*0.15],
      [BAR+B*0.5,  392, B*0.15],
      [BAR+B*0.75, 494, B*0.15],
      [BAR*2,   196, B*0.15],
      [BAR*2+B*0.25, 247, B*0.15],
      [BAR*2+B*0.5,  330, B*0.15],
      [BAR*2+B*0.75, 392, B*0.15],
      [BAR*3,   165, B*0.15],
      [BAR*3+B*0.25, 196, B*0.15],
      [BAR*3+B*0.5,  220, B*0.15],
      [BAR*3+B*0.75, 165, B*0.15],
    ];
    arp.forEach(([offset, freq, dur]) => {
      this._osc('triangle', freq, startTime + offset, dur, 0.18);
    });

    // ── Percussão: kick no 1 e 3, snare no 2 e 4 ──
    for (let bar = 0; bar < 4; bar++) {
      const t = startTime + bar * BAR;
      // Kicks
      this._noise(t,           0.18, 0.7, 80,  'lowpass');
      this._osc('sine', 55, t, 0.18, 0.9); // sub do kick
      this._noise(t + B*2,     0.18, 0.7, 80,  'lowpass');
      this._osc('sine', 55, t + B*2, 0.18, 0.9);
      // Snares
      this._noise(t + B,       0.12, 0.45, 1800, 'highpass');
      this._noise(t + B*3,     0.12, 0.45, 1800, 'highpass');
      // Hi-hat (dezesseis avos)
      for (let s = 0; s < 16; s++) {
        this._noise(t + (B/4)*s, 0.04, 0.12, 8000, 'highpass');
      }
    }

    const loopDuration = BAR * 4;
    const id = setTimeout(() => {
      if (this._running) this._scheduleLoop(startTime + loopDuration);
    }, (loopDuration - 0.3) * 1000);
    this._scheduledIds.push(id);
  }

  stop() {
    this._running = false;
    this._scheduledIds.forEach(id => clearTimeout(id));
    this._scheduledIds = [];
    this._nodes.forEach(n => {
      try { n.disconnect(); } catch (_) {}
      try { if (n.stop) n.stop(0); } catch (_) {}
    });
    this._nodes = [];
    this._masterGain = null;
  }

  fadeOut(duration = 1.0) {
    if (!this._masterGain) return;
    const g = this._masterGain;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + duration);
    setTimeout(() => this.stop(), duration * 1000 + 100);
  }
}

export const menuMusic = new MenuMusic();
