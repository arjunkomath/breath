# Breath

A breathing timer you set to your own rhythm.

Name each step of the breath, give it a length, and pick how long to sit. A circle keeps count — it swells on the inhale, holds, and fades back down on the exhale.

## Run it

```bash
bun install
bun dev
```

Then open [http://localhost:3000](http://localhost:3000).

## How it works

Each step has a name, a duration in seconds, and a motion — `↑` expand, `—` hold, `↓` contract. The motion is set per step rather than guessed from the name, so any pattern you invent still animates correctly. Holds keep whatever fullness the previous step ended on.

Sessions always end on a whole cycle. Ask for 5 minutes of 4-7-8 and you get 16 rounds — 5:04 — rather than being cut off mid-breath. The setup screen shows the real duration before you start.

Presets for Box, 4-7-8, and Coherent are one tap. Your settings are saved locally.

Space pauses, Escape ends.

## Generate the voiceover cues

The optional voiceover uses three static audio files, so the OpenAI key is never
sent to the browser. Generate or replace them with:

```bash
export OPENAI_API_KEY="your-key"
bun run generate:voice
```

This writes `inhale.mp3`, `hold.mp3`, and `exhale.mp3` to
`public/audio/voice/`. Rerunning the command replaces the existing cues.

## Layout

```
app/
  _lib/breath.ts        timing math, presets, saved settings
  _lib/sound.ts         tone and generated voice cues
  _components/setup.tsx    the config screen
  _components/session.tsx  the animated session
scripts/voice/
  generate.mjs          reusable OpenAI voice generator
```

## Checks

```bash
bun run lint
bun run build
npx react-doctor@latest .
```
