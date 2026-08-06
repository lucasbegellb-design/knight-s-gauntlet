/**
 * Procedural sound effects.
 *
 * The game shipped with no audio at all, which was by some distance its largest gap in feel — a
 * hit that makes no sound doesn't land no matter how much the sprite shakes. Rather than add a
 * megabyte of samples to a repo whose whole art pipeline is generated, every sound here is
 * synthesised at play time with the Web Audio API: a handful of oscillators and noise bursts,
 * a few hundred bytes of code, nothing to download and nothing to license.
 *
 * Design rules that keep it from becoming irritating in an idle game the player leaves running:
 *  - Every voice is short (< 400ms) and ends in a hard ramp to silence, so nothing accumulates.
 *  - Repeated sounds (ordinary hits) are quiet and pitch-jittered so a long fight doesn't turn
 *    into a metronome.
 *  - `MAX_CONCURRENT_VOICES` drops sounds rather than queueing them; at x4 speed the engine can
 *    emit dozens of events per second and the correct response is to skip, not to stack.
 *  - The context is created lazily on first play, because browsers refuse to start one before a
 *    user gesture and a rejected context left in a bad state stays broken for the session.
 */

export type SfxName =
  | 'hit'
  | 'crit'
  | 'heavyHit'
  | 'monsterHit'
  | 'death'
  | 'levelUp'
  | 'burstReady'
  | 'burstFire'
  | 'loot'
  | 'affinityStrong'
  | 'affinityWeak'
  | 'echo'
  | 'gameOver';

let context: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let activeVoices = 0;

const MAX_CONCURRENT_VOICES = 10;
const MASTER_VOLUME = 0.25;

function ensureContext(): AudioContext | null {
  if (context) return context;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
    master = context.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(context.destination);
    return context;
  } catch {
    // Autoplay policy or an unavailable device — stay silent rather than throwing into the game loop.
    return null;
  }
}

export function setMuted(value: boolean): void {
  muted = value;
  if (master && context) master.gain.setTargetAtTime(value ? 0 : MASTER_VOLUME, context.currentTime, 0.01);
}

export function isMuted(): boolean {
  return muted;
}

/** Resumes a context suspended by autoplay policy. Safe to call on every user gesture. */
export function resumeAudio(): void {
  const ctx = ensureContext();
  if (ctx?.state === 'suspended') void ctx.resume();
}

interface ToneSpec {
  /** Oscillator shape. */
  type: OscillatorType;
  /** Starting frequency in Hz. */
  freq: number;
  /** Frequency at the end of the tone; a fall reads as impact, a rise as reward. */
  endFreq?: number;
  duration: number;
  gain: number;
  /** Seconds to wait before starting, for layered or arpeggiated sounds. */
  delay?: number;
}

function playTone(ctx: AudioContext, spec: ToneSpec): void {
  const start = ctx.currentTime + (spec.delay ?? 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = spec.type;
  osc.frequency.setValueAtTime(spec.freq, start);
  if (spec.endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, spec.endFreq), start + spec.duration);
  }

  // Fast attack, exponential decay to a near-zero floor: exponentialRamp cannot reach 0.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(spec.gain, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.duration);

  osc.connect(gain);
  gain.connect(master as GainNode);
  osc.start(start);
  osc.stop(start + spec.duration + 0.02);
}

/** A short filtered noise burst — the percussive half of an impact. */
function playNoise(ctx: AudioContext, duration: number, gainValue: number, filterHz: number, delay = 0): void {
  const start = ctx.currentTime + delay;
  const frameCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    // Linearly faded white noise; the filter below does the tonal shaping.
    data[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterHz;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(master as GainNode);
  source.start(start);
  source.stop(start + duration + 0.02);
}

/** Small random detune so repeated hits never sound mechanically identical. */
function jitter(freq: number, amount = 0.08): number {
  return freq * (1 + (Math.random() * 2 - 1) * amount);
}

const VOICES: Record<SfxName, (ctx: AudioContext) => void> = {
  hit: (ctx) => {
    playTone(ctx, { type: 'triangle', freq: jitter(320), endFreq: 120, duration: 0.09, gain: 0.16 });
    playNoise(ctx, 0.05, 0.1, 2200);
  },
  crit: (ctx) => {
    playTone(ctx, { type: 'square', freq: jitter(660), endFreq: 180, duration: 0.16, gain: 0.2 });
    playTone(ctx, { type: 'triangle', freq: jitter(990), endFreq: 300, duration: 0.14, gain: 0.12, delay: 0.02 });
    playNoise(ctx, 0.09, 0.18, 3600);
  },
  heavyHit: (ctx) => {
    playTone(ctx, { type: 'sawtooth', freq: jitter(180), endFreq: 60, duration: 0.22, gain: 0.22 });
    playNoise(ctx, 0.13, 0.2, 1400);
  },
  monsterHit: (ctx) => {
    playTone(ctx, { type: 'sawtooth', freq: jitter(150), endFreq: 70, duration: 0.11, gain: 0.14 });
    playNoise(ctx, 0.07, 0.12, 900);
  },
  death: (ctx) => {
    playTone(ctx, { type: 'sawtooth', freq: 240, endFreq: 40, duration: 0.4, gain: 0.2 });
    playNoise(ctx, 0.25, 0.14, 700);
  },
  levelUp: (ctx) => {
    // Rising arpeggio — the one unambiguously good-news sound in the game.
    playTone(ctx, { type: 'triangle', freq: 523, duration: 0.1, gain: 0.16 });
    playTone(ctx, { type: 'triangle', freq: 659, duration: 0.1, gain: 0.16, delay: 0.08 });
    playTone(ctx, { type: 'triangle', freq: 784, duration: 0.18, gain: 0.18, delay: 0.16 });
  },
  burstReady: (ctx) => {
    playTone(ctx, { type: 'sine', freq: 880, endFreq: 1320, duration: 0.22, gain: 0.14 });
    playTone(ctx, { type: 'sine', freq: 1320, endFreq: 1760, duration: 0.18, gain: 0.1, delay: 0.1 });
  },
  burstFire: (ctx) => {
    playTone(ctx, { type: 'sawtooth', freq: 130, endFreq: 900, duration: 0.28, gain: 0.2 });
    playTone(ctx, { type: 'square', freq: 440, endFreq: 1760, duration: 0.3, gain: 0.14, delay: 0.05 });
    playNoise(ctx, 0.3, 0.2, 5200, 0.05);
  },
  loot: (ctx) => {
    playTone(ctx, { type: 'sine', freq: 1046, duration: 0.09, gain: 0.13 });
    playTone(ctx, { type: 'sine', freq: 1568, duration: 0.14, gain: 0.11, delay: 0.07 });
  },
  affinityStrong: (ctx) => {
    playTone(ctx, { type: 'sine', freq: 1200, endFreq: 1800, duration: 0.11, gain: 0.1 });
  },
  affinityWeak: (ctx) => {
    playTone(ctx, { type: 'sine', freq: 420, endFreq: 260, duration: 0.13, gain: 0.09 });
  },
  echo: (ctx) => {
    // Detuned unison, deliberately slightly wrong — it is supposed to be you, and isn't.
    playTone(ctx, { type: 'sine', freq: 220, endFreq: 180, duration: 0.7, gain: 0.14 });
    playTone(ctx, { type: 'sine', freq: 223, endFreq: 182, duration: 0.7, gain: 0.12, delay: 0.02 });
    playTone(ctx, { type: 'sine', freq: 440, endFreq: 360, duration: 0.5, gain: 0.07, delay: 0.12 });
  },
  gameOver: (ctx) => {
    playTone(ctx, { type: 'triangle', freq: 392, endFreq: 330, duration: 0.3, gain: 0.16 });
    playTone(ctx, { type: 'triangle', freq: 330, endFreq: 262, duration: 0.35, gain: 0.16, delay: 0.24 });
    playTone(ctx, { type: 'sine', freq: 196, endFreq: 130, duration: 0.6, gain: 0.14, delay: 0.5 });
  },
};

/**
 * Plays a sound, or does nothing. Never throws and never awaits — this is called from inside the
 * Phaser update loop, where an exception would take the whole frame down.
 */
export function playSfx(name: SfxName): void {
  if (muted) return;
  if (activeVoices >= MAX_CONCURRENT_VOICES) return;

  const ctx = ensureContext();
  if (!ctx || !master) return;
  if (ctx.state === 'suspended') {
    void ctx.resume();
    return;
  }

  activeVoices += 1;
  // Voices are all under half a second; releasing the slot on a timer is cheaper and more robust
  // than tracking individual node lifetimes for something this short-lived.
  window.setTimeout(() => {
    activeVoices = Math.max(0, activeVoices - 1);
  }, 400);

  try {
    VOICES[name](ctx);
  } catch {
    // A failed voice must never break the frame it was triggered from.
  }
}
