/**
 * sound.js - Procedural Web Audio API Sound Synthesizer
 * 100% self-contained sound effects for "Pump Shift: Fuel Station Simulator"
 * No external audio files or network requests required.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.pumpGain = null;
    this.pumpOsc = null;
    this.pumpNoise = null;
    this.isPumping = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initialized = true;
      }
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.isPumping) {
      this.stopPumpSound();
    }
    return this.isMuted;
  }

  setMute(mute) {
    this.isMuted = mute;
    if (this.isMuted && this.isPumping) {
      this.stopPumpSound();
    }
  }

  // UI Click
  playClick() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // Car Arrival (Motor Rumble + gentle squeak)
  playCarArrival() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Engine rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 1.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 1.2);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 1.2);

    // Subtle brake squeak
    setTimeout(() => {
      if (this.isMuted || !this.ctx) return;
      const squeak = this.ctx.createOscillator();
      const sqGain = this.ctx.createGain();
      squeak.type = 'sine';
      squeak.frequency.setValueAtTime(2400, this.ctx.currentTime);
      squeak.frequency.exponentialRampToValueAtTime(1800, this.ctx.currentTime + 0.25);

      sqGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      sqGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

      squeak.connect(sqGain);
      sqGain.connect(this.ctx.destination);

      squeak.start();
      squeak.stop(this.ctx.currentTime + 0.25);
    }, 600);
  }

  // Cheerful Car Horn ("Beep-Beep")
  playHorn(toneType = 'happy') {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const f1 = toneType === 'angry' ? 240 : 349.23; // F4
    const f2 = toneType === 'angry' ? 275 : 440;    // A4
    const duration = toneType === 'angry' ? 0.45 : 0.15;

    const playBeep = (startTime) => {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(f1, startTime);
      osc2.frequency.setValueAtTime(f2, startTime);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.005, startTime + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);
    };

    const now = this.ctx.currentTime;
    playBeep(now);
    if (toneType === 'happy') {
      setTimeout(() => {
        if (!this.isMuted && this.ctx) playBeep(this.ctx.currentTime);
      }, 180);
    }
  }

  // Fuel Pumping Sound (Continuous bubbly liquid rush)
  startPumpSound() {
    if (this.isMuted || this.isPumping) return;
    this.ensureContext();
    if (!this.ctx) return;

    this.isPumping = true;
    const t = this.ctx.currentTime;

    // Pump motor hum
    this.pumpOsc = this.ctx.createOscillator();
    this.pumpOsc.type = 'triangle';
    this.pumpOsc.frequency.setValueAtTime(110, t);

    // Liquid bubbling noise using white noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.pumpNoise = this.ctx.createBufferSource();
    this.pumpNoise.buffer = noiseBuffer;
    this.pumpNoise.loop = true;

    // Filter to sound like liquid rushing in hose
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, t);
    filter.Q.setValueAtTime(2.5, t);

    // LFO for bubbly flow modulation
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(12, t);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(220, t);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(t);
    this.pumpLFO = lfo;

    this.pumpGain = this.ctx.createGain();
    this.pumpGain.gain.setValueAtTime(0.01, t);
    this.pumpGain.gain.linearRampToValueAtTime(0.16, t + 0.15);

    this.pumpOsc.connect(this.pumpGain);
    this.pumpNoise.connect(filter);
    filter.connect(this.pumpGain);
    this.pumpGain.connect(this.ctx.destination);

    this.pumpOsc.start(t);
    this.pumpNoise.start(t);
  }

  stopPumpSound() {
    if (!this.isPumping) return;
    this.isPumping = false;
    if (this.ctx && this.pumpGain) {
      const t = this.ctx.currentTime;
      this.pumpGain.gain.setValueAtTime(this.pumpGain.gain.value, t);
      this.pumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      setTimeout(() => {
        try {
          if (this.pumpOsc) { this.pumpOsc.stop(); this.pumpOsc.disconnect(); }
          if (this.pumpNoise) { this.pumpNoise.stop(); this.pumpNoise.disconnect(); }
          if (this.pumpLFO) { this.pumpLFO.stop(); this.pumpLFO.disconnect(); }
        } catch (e) {}
      }, 120);
    }
  }

  // Cash Register Ka-Ching (Bell ring + mechanical coins)
  playCashChime() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // High clear bell (E6: 1318.51Hz)
    const bell = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(1318.5, t);

    bellGain.gain.setValueAtTime(0.3, t);
    bellGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    bell.connect(bellGain);
    bellGain.connect(this.ctx.destination);
    bell.start(t);
    bell.stop(t + 0.8);

    // Coin clinks
    [0.05, 0.12, 0.18, 0.24].forEach((delay, idx) => {
      const coin = this.ctx.createOscillator();
      const cGain = this.ctx.createGain();
      coin.type = 'triangle';
      coin.frequency.setValueAtTime(1800 + idx * 300, t + delay);

      cGain.gain.setValueAtTime(0.12, t + delay);
      cGain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.12);

      coin.connect(cGain);
      cGain.connect(this.ctx.destination);
      coin.start(t + delay);
      coin.stop(t + delay + 0.12);
    });
  }

  // Car Driving Away (Acceleration pitch sweep)
  playCarDeparture() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 1.8);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, t);
    filter.frequency.exponentialRampToValueAtTime(550, t + 1.8);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 2.2);
  }

  // Error / Warning Buzzer
  playError() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.setValueAtTime(120, t + 0.15);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  // Success / Level Up / High Rating Chime
  playSuccess() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + i * 0.1;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.35);
    });
  }

  // Undo Sound (Reverse swoosh)
  playUndo() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.28);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  // Calculation Beep (Computer Node Traversal)
  playCalcBeep(freq = 880) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.08);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Finish Point Checkpoint Reached (10 cars done fanfare)
  playCheckpointReached() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const time = t + idx * 0.09;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.16, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.45);
    });
  }

  // Total Revenue Calculated Sound
  playTotalCalculated() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const time = t + idx * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.35);
    });
  }
}

// Global Sound Instance
window.soundEngine = new SoundEngine();

