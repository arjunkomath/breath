import type { Motion } from "./breath";

let ctx: AudioContext | null = null;

export function primeAudio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  // Browsers suspend the context when it is created outside a gesture.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function pluck(freq: number, at: number, duration: number, peak: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + duration + 0.05);
}

const CUE_FREQ: Record<Motion, number> = {
  expand: 587.33,
  hold: 440,
  contract: 392,
};

export function cue(motion: Motion) {
  const audio = primeAudio();
  if (!audio) return;
  pluck(CUE_FREQ[motion], audio.currentTime, 0.55, 0.09);
}

export function chime() {
  const audio = primeAudio();
  if (!audio) return;
  const now = audio.currentTime;
  [392, 587.33, 783.99].forEach((freq, i) => {
    pluck(freq, now + i * 0.16, 1.6, 0.08);
  });
}
