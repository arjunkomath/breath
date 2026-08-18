import type { Motion } from "./breath";

let ctx: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function primeAudio() {
  const audio = getAudioContext();
  if (!audio) return null;
  // Browsers suspend the context when it is created outside a gesture.
  if (audio.state === "suspended") void audio.resume().catch(() => {});
  return audio;
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

const VOICE_PATH: Record<Motion, string> = {
  expand: "/audio/voice/inhale.mp3",
  hold: "/audio/voice/hold.mp3",
  contract: "/audio/voice/exhale.mp3",
};

const voiceBuffers: Partial<Record<Motion, AudioBuffer>> = {};
const voiceLoads: Partial<Record<Motion, Promise<boolean>>> = {};

function loadVoice(motion: Motion) {
  if (voiceBuffers[motion]) return Promise.resolve(true);
  if (voiceLoads[motion]) return voiceLoads[motion];

  const audio = getAudioContext();
  if (!audio) return Promise.resolve(false);

  const path = VOICE_PATH[motion];
  voiceLoads[motion] = fetch(path)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Could not load ${path}`);
      voiceBuffers[motion] = await audio.decodeAudioData(
        await response.arrayBuffer(),
      );
      return true;
    })
    .catch(() => {
      delete voiceLoads[motion];
      return false;
    });

  return voiceLoads[motion];
}

export function primeVoice(motion?: Motion) {
  if (motion) return loadVoice(motion);
  return Promise.all(
    (Object.keys(VOICE_PATH) as Motion[]).map(loadVoice),
  ).then((loaded) => loaded.every(Boolean));
}

export function voiceCue(motion: Motion) {
  const audio = primeAudio();
  const buffer = voiceBuffers[motion];
  if (!audio || !buffer) return;

  const source = audio.createBufferSource();
  const gain = audio.createGain();
  source.buffer = buffer;
  gain.gain.value = 0.7;
  source.connect(gain).connect(audio.destination);
  source.start();
}

export function chime() {
  const audio = primeAudio();
  if (!audio) return;
  const now = audio.currentTime;
  [392, 587.33, 783.99].forEach((freq, i) => {
    pluck(freq, now + i * 0.16, 1.6, 0.08);
  });
}
