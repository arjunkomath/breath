<script lang="ts">
  import { onMount } from "svelte";
  import Session from "./components/Session.svelte";
  import Setup from "./components/Setup.svelte";
  import {
    DEFAULT_CONFIG,
    loadConfig,
    saveConfig,
    type Config,
  } from "./lib/breath";
  import { primeAudio, primeVoice } from "./lib/sound";

  let config = $state<Config>(DEFAULT_CONFIG);
  let runId = $state(0);
  let running = $state(false);

  onMount(() => {
    config = loadConfig() ?? DEFAULT_CONFIG;
    void primeVoice();
  });

  function updateConfig(next: Config) {
    config = next;
    saveConfig(next);
  }

  async function start() {
    // Unlock audio here, while we still have the click gesture.
    if (config.sound || config.voice) primeAudio();
    if (config.voice) {
      const firstCue = primeVoice(config.slots[0].motion);
      void primeVoice();
      await firstCue;
    }
    runId += 1;
    running = true;
  }
</script>

{#if running}
  {#key runId}
    <Session
      {config}
      onExit={() => (running = false)}
      onRestart={() => (runId += 1)}
    />
  {/key}
{:else}
  <Setup {config} onChange={updateConfig} onStart={start} />
{/if}
