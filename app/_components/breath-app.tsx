"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getConfig,
  getServerConfig,
  setConfig,
  subscribeConfig,
} from "../_lib/breath";
import { primeAudio, primeVoice } from "../_lib/sound";
import Session from "./session";
import Setup from "./setup";

export default function BreathApp() {
  const config = useSyncExternalStore(
    subscribeConfig,
    getConfig,
    getServerConfig,
  );
  const [runId, setRunId] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    void primeVoice();
  }, []);

  const start = async () => {
    // Unlock audio here, while we still have the click gesture.
    if (config.sound || config.voice) primeAudio();
    if (config.voice) {
      const firstCue = primeVoice(config.slots[0].motion);
      void primeVoice();
      await firstCue;
    }
    setRunId((n) => n + 1);
    setRunning(true);
  };

  if (!running) {
    return <Setup config={config} onChange={setConfig} onStart={start} />;
  }

  return (
    <Session
      key={runId}
      config={config}
      onExit={() => setRunning(false)}
      onRestart={() => setRunId((n) => n + 1)}
    />
  );
}
