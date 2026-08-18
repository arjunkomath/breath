<script lang="ts">
  import { onMount } from "svelte";
  import {
    cycleSeconds,
    formatClock,
    MOTION_LABEL,
    phaseAt,
    plannedSeconds,
    scaleRamps,
    type Config,
  } from "../lib/breath";
  import { chime, cue, primeAudio, voiceCue } from "../lib/sound";

  const START_DELAY = 3;
  const PETAL_ANGLES = Array.from({ length: 8 }, (_, index) => index * 45);
  const STACKED_ALPHA = 1 - 0.9 ** PETAL_ANGLES.length;
  const CLOSED_FADE = 0.01 / STACKED_ALPHA;

  type Props = {
    config: Config;
    onExit: () => void;
    onRestart: () => void;
  };

  let { config, onExit, onRestart }: Props = $props();

  let cycle = $derived(cycleSeconds(config.slots));
  let planned = $derived(plannedSeconds(config.slots, config.totalMinutes));
  let ramps = $derived(scaleRamps(config.slots));

  let elapsed = $state(0);
  let paused = $state(false);
  let done = $state(false);
  let countdown = $state(START_DELAY);

  let base = 0;
  let anchor = 0;
  let lastCued: number | null = null;

  $effect(() => {
    if (countdown <= 0) return;

    const timer = window.setTimeout(() => (countdown -= 1), 1000);
    return () => window.clearTimeout(timer);
  });

  $effect(() => {
    if (countdown > 0 || paused || done) return;

    anchor = performance.now();
    let frame = requestAnimationFrame(function tick() {
      const now = base + (performance.now() - anchor) / 1000;
      if (now >= planned) {
        elapsed = planned;
        done = true;
        return;
      }
      elapsed = now;
      frame = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(frame);
      base = Math.min(
        planned,
        base + (performance.now() - anchor) / 1000,
      );
    };
  });

  let phase = $derived(
    phaseAt(config.slots, Math.min(elapsed, planned - 0.0001), cycle),
  );
  let slot = $derived(config.slots[phase.index] ?? config.slots[0]);
  let ramp = $derived(ramps[phase.index] ?? { from: 0, to: 1 });
  let slotProgress = $derived(Math.min(1, phase.slotElapsed / slot.seconds));
  let motionProgress = $derived(
    slot.motion === "expand"
      ? Math.sin((Math.PI / 2) * slotProgress)
      : slot.motion === "contract"
        ? 1 - Math.cos((Math.PI / 2) * slotProgress)
        : 0,
  );
  let fullness = $derived(
    ramp.from + (ramp.to - ramp.from) * motionProgress,
  );
  let movingSlots = $derived(
    config.slots.reduce(
      (count, item) => count + (item.motion === "hold" ? 0 : 1),
      0,
    ),
  );
  let completedMovements = $derived(
    config.slots
      .slice(0, phase.index)
      .reduce(
        (count, item) => count + (item.motion === "hold" ? 0 : 1),
        phase.cycle * movingSlots,
      ),
  );
  let rotation = $derived(
    ((completedMovements + motionProgress) * 180) % 360,
  );
  let openness = $derived(done ? 0 : fullness);
  let petalOffset = $derived((openness * 100) / 6);
  // Eight petals at 10% alpha composite to ~57% once they stack, so the group
  // is faded alongside them to leave the closed circle barely there.
  let petalFade = $derived(CLOSED_FADE + (1 - CLOSED_FADE) * openness);
  let remaining = $derived(
    Math.max(1, Math.ceil(slot.seconds - phase.slotElapsed)),
  );
  let phaseKey = $derived(
    done ? -1 : phase.cycle * config.slots.length + phase.index,
  );

  $effect(() => {
    if (
      countdown > 0 ||
      phaseKey < 0 ||
      paused ||
      lastCued === phaseKey
    ) {
      return;
    }

    lastCued = phaseKey;
    const motion = config.slots[phaseKey % config.slots.length].motion;
    if (config.sound) cue(motion);
    if (config.voice) voiceCue(motion);
  });

  $effect(() => {
    if (done && config.sound) chime();
  });

  $effect(() => {
    if (config.sound || config.voice) primeAudio();
  });

  // Keeps the screen awake mid-session where the browser supports it.
  $effect(() => {
    if (done) return;

    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    navigator.wakeLock
      ?.request("screen")
      .then((lock) => {
        if (released) void lock.release();
        else sentinel = lock;
      })
      .catch(() => {});

    return () => {
      released = true;
      sentinel?.release().catch(() => {});
    };
  });

  function onKey(event: KeyboardEvent) {
    if (event.code === "Space") {
      event.preventDefault();
      if (countdown === 0 && !done) paused = !paused;
    } else if (event.key === "Escape") {
      onExit();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  let rounds = $derived(Math.round(planned / cycle));
  let progress = $derived(Math.min(1, elapsed / planned));
</script>

<main class="flex flex-1 flex-col items-center justify-center px-6 py-6 sm:py-10">
  <div class="relative size-[min(76vw,40vh,21rem)]">
    <svg
      viewBox="0 0 100 100"
      class="absolute inset-0 size-full -rotate-90"
      aria-hidden="true"
    >
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke-width="2.5"
        class="stroke-accent opacity-20"
      />
      {#if progress > 0}
        <!-- pathLength normalises the circumference, so the dash offset is
             just the fraction of the session still to run. -->
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke-width="2.5"
          stroke-linecap="round"
          pathLength="1"
          stroke-dasharray="1"
          stroke-dashoffset={1 - progress}
          class="stroke-accent"
        />
      {/if}
    </svg>

    <div
      class="absolute inset-0"
      aria-hidden="true"
      style:opacity={petalFade}
    >
      {#each PETAL_ANGLES as angle, index (angle)}
        <div
          class={`absolute inset-0 grid place-items-center ${index === 0 ? "" : "motion-reduce:hidden"}`}
        >
          <div
            class="size-1/2 rounded-full bg-accent opacity-10 motion-reduce:!transform-none"
            style:transform={`rotate(${angle + rotation}deg) translate(${petalOffset}%, ${petalOffset}%)`}
          ></div>
        </div>
      {/each}
    </div>

    <div class="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
      {#if countdown > 0}
        <p class="font-display text-3xl sm:text-4xl">Ready</p>
        <p aria-live="polite" class="text-lg text-ink-soft tabular-nums">
          {countdown}
        </p>
      {:else if done}
        <p class="font-display text-3xl sm:text-4xl">Done</p>
        <p class="text-sm text-ink-soft tabular-nums">
          {formatClock(planned)} · {rounds} rounds
        </p>
      {:else}
        <p aria-live="polite" class="font-display text-3xl sm:text-4xl">
          {paused ? "Paused" : MOTION_LABEL[slot.motion]}
        </p>
        <p class="text-lg text-ink-soft tabular-nums">{remaining}</p>
      {/if}
    </div>
  </div>

  <div class="mt-10 flex w-full max-w-sm justify-between text-xs text-ink-faint tabular-nums sm:mt-16">
    <span>{formatClock(elapsed)}</span>
    <span>{formatClock(planned)}</span>
  </div>

  <div class="mt-7 flex w-full max-w-sm gap-3 sm:mt-9">
    {#if done}
      <button
        type="button"
        onclick={onRestart}
        class="flex-1 touch-manipulation bg-accent py-4 text-paper transition-opacity hover:opacity-85"
      >
        Again
      </button>
      <button
        type="button"
        onclick={onExit}
        class="flex-1 touch-manipulation border border-rule py-4 text-ink-soft transition-colors hover:border-accent hover:text-accent"
      >
        Change rhythm
      </button>
    {:else if countdown > 0}
      <button
        type="button"
        onclick={onExit}
        class="flex-1 touch-manipulation border border-rule py-4 text-ink-soft transition-colors hover:border-accent hover:text-accent"
      >
        Cancel
      </button>
    {:else}
      <button
        type="button"
        onclick={() => (paused = !paused)}
        class="flex-1 touch-manipulation border border-rule py-4 text-ink transition-colors hover:border-accent hover:text-accent"
      >
        {paused ? "Resume" : "Pause"}
      </button>
      <button
        type="button"
        onclick={onExit}
        class="flex-1 touch-manipulation border border-rule py-4 text-ink-soft transition-colors hover:border-accent hover:text-accent"
      >
        End
      </button>
    {/if}
  </div>
</main>
