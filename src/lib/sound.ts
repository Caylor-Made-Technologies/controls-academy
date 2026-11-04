/**
 * Tiny generated sounds (Web Audio), off by default. No recorded samples.
 */
let ctx: AudioContext | null = null;
let enabled = false;
let humOsc: OscillatorNode | null = null;
let humGain: GainNode | null = null;

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    return ctx;
  } catch {
    return null;
  }
}

function noiseBurst(c: AudioContext, dur: number, freq: number, gain: number) {
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start();
}

export const sfx = {
  setEnabled(on: boolean) {
    enabled = on;
    if (!on) sfx.hum(0);
  },
  /** Contactor pulling in / dropping out. */
  clunk() {
    const c = ac();
    if (!c) return;
    noiseBurst(c, 0.09, 900, 0.5);
  },
  /** Soft tap for buttons. */
  tick() {
    const c = ac();
    if (!c) return;
    noiseBurst(c, 0.025, 2500, 0.15);
  },
  /** Motor hum, level 0…1 (follows speed). */
  hum(level: number) {
    const c = ctx;
    if (!enabled || !c || level <= 0.01) {
      if (humGain && ctx) humGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      return;
    }
    if (!humOsc) {
      humOsc = c.createOscillator();
      humOsc.type = 'sawtooth';
      humGain = c.createGain();
      humGain.gain.value = 0;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 300;
      humOsc.connect(f).connect(humGain).connect(c.destination);
      humOsc.start();
    }
    humOsc.frequency.setTargetAtTime(40 + 80 * level, c.currentTime, 0.2);
    humGain!.gain.setTargetAtTime(0.035 * level, c.currentTime, 0.2);
  },
  /** Short alarm horn. */
  horn() {
    const c = ac();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'square';
    o.frequency.value = 440;
    g.gain.value = 0;
    o.connect(g).connect(c.destination);
    const t = c.currentTime;
    for (let k = 0; k < 3; k++) {
      g.gain.setValueAtTime(0.06, t + k * 0.3);
      g.gain.setValueAtTime(0, t + k * 0.3 + 0.18);
    }
    o.start();
    o.stop(t + 1);
  },
};

/** Short vibration where supported (Android). iOS ignores it silently. */
export function buzz(ms = 10) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}
