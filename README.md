# Breath

A breathing timer you set to your own rhythm.

Choose each step of the breath, give it a length, and pick how long to sit. A circle keeps count — it swells on the inhale, holds, and fades back down on the exhale.

Built with SvelteKit

## Run it

```bash
bun install
bun dev
```

Then open [http://localhost:5173](http://localhost:5173).

To preview the production build:

```bash
bun run build
bun run preview
```

## How it works

Each step is Inhale, Hold, or Exhale and has a duration in seconds. The phase controls the circle motion, and holds keep whatever fullness the previous step ended on.

Sessions always end on a whole cycle. Ask for 5 minutes of 4-7-8 and you get 16 rounds — 5:04 — rather than being cut off mid-breath. The setup screen shows the real duration before you start.

Presets for Box, 4-7-8, and Coherent are one tap. You can name and save your own rhythms too; everything stays on your device.

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
src/
  lib/breath.ts             timing math, presets, saved settings
  lib/sound.ts              tone and generated voice cues
  components/Setup.svelte   the config screen
  components/Session.svelte the animated session
  routes/+page.svelte       the prerendered app page
scripts/voice/
  generate.mjs              reusable OpenAI voice generator
```

## Checks

```bash
bun run lint
bun run build
```

## Docker

```bash
docker build -t breath .
docker run --rm -p 3000:3000 breath
```
