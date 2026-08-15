#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("OPENAI_API_KEY is required.");
  process.exit(1);
}

const outputDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../public/audio/voice",
);
const cues = {
  inhale: "Inhale.",
  hold: "Hold.",
  exhale: "Exhale.",
};

await mkdir(outputDir, { recursive: true });

for (const [name, input] of Object.entries(cues)) {
  console.log(`Generating ${name}.mp3…`);

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "marin",
      input,
      instructions:
        "Speak only the breathing cue in a warm, soothing, unhurried voice. Add no other words or sounds.",
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI returned ${response.status}: ${await response.text()}`,
    );
  }

  await writeFile(
    resolve(outputDir, `${name}.mp3`),
    Buffer.from(await response.arrayBuffer()),
  );
}

console.log(`Voice cues written to ${outputDir}`);
