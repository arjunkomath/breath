<script lang="ts">
  import {
    cycleSeconds,
    formatClock,
    MOTION_LABEL,
    MOTION_ORDER,
    plannedSeconds,
    PRESETS,
    uid,
    type Config,
    type Slot,
  } from "../lib/breath";

  type Props = {
    config: Config;
    onChange: (next: Config) => void;
    onStart: () => void;
  };

  let { config, onChange, onStart }: Props = $props();

  let cycle = $derived(cycleSeconds(config.slots));
  let planned = $derived(plannedSeconds(config.slots, config.totalMinutes));
  let rounds = $derived(cycle > 0 ? Math.round(planned / cycle) : 0);
  let ready = $derived(cycle > 0 && config.totalMinutes > 0);

  function patch(id: string, next: Partial<Slot>) {
    onChange({
      ...config,
      slots: config.slots.map((slot) =>
        slot.id === id ? { ...slot, ...next } : slot,
      ),
    });
  }

  function addSlot() {
    onChange({
      ...config,
      slots: [
        ...config.slots,
        { id: uid(), seconds: 4, motion: "hold" },
      ],
    });
  }

  function removeSlot(id: string) {
    onChange({
      ...config,
      slots: config.slots.filter((slot) => slot.id !== id),
    });
  }

  function applyPreset(preset: { slots: Omit<Slot, "id">[] }) {
    onChange({
      ...config,
      slots: preset.slots.map((slot) => ({ ...slot, id: uid() })),
    });
  }

  function savePreset() {
    const name = window.prompt("Name this rhythm")?.trim();
    if (!name) return;

    onChange({
      ...config,
      customPresets: [
        ...config.customPresets,
        {
          id: uid(),
          name,
          slots: config.slots.map(({ seconds, motion }) => ({
            seconds,
            motion,
          })),
        },
      ],
    });
  }

  function removePreset(id: string) {
    onChange({
      ...config,
      customPresets: config.customPresets.filter((preset) => preset.id !== id),
    });
  }
</script>

<main class="flex flex-1 flex-col justify-center px-6 py-14 sm:px-12">
  <div class="w-full max-w-lg sm:ml-[8vw]">
    <h1 class="font-display text-5xl sm:text-6xl">Breath</h1>

    <div class="mt-11">
      <div class="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        {#each PRESETS as preset (preset.name)}
          <button
            type="button"
            onclick={() => applyPreset(preset)}
            class="group touch-manipulation py-1.5 text-sm text-ink-soft transition-colors hover:text-accent"
          >
            {preset.name}
            <span class="ml-1.5 text-ink-faint group-hover:text-accent/70">
              {preset.hint}
            </span>
          </button>
        {/each}
      </div>

      {#if config.customPresets.length > 0}
        <div class="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <span class="py-1.5 text-xs tracking-widest text-ink-faint uppercase">
            saved
          </span>
          {#each config.customPresets as preset (preset.id)}
            <span class="flex items-baseline">
              <button
                type="button"
                onclick={() => applyPreset(preset)}
                class="group touch-manipulation py-1.5 text-sm text-ink-soft transition-colors hover:text-accent"
              >
                {preset.name}
                <span class="ml-1.5 text-ink-faint group-hover:text-accent/70">
                  {preset.slots.map((slot) => slot.seconds).join("·")}
                </span>
              </button>
              <button
                type="button"
                onclick={() => removePreset(preset.id)}
                aria-label={`Delete ${preset.name} preset`}
                title={`Delete ${preset.name}`}
                class="touch-manipulation px-1.5 py-1.5 text-ink-faint transition-colors hover:text-accent"
              >
                ×
              </button>
            </span>
          {/each}
        </div>
      {/if}
    </div>

    <ul class="mt-6 border-t border-rule">
      {#each config.slots as slot, i (slot.id)}
        <li class="flex items-center gap-2 border-b border-rule py-2.5 sm:gap-3">
          <select
            value={slot.motion}
            onchange={(event) =>
              patch(slot.id, {
                motion: event.currentTarget.value as Slot["motion"],
              })}
            aria-label={`Step ${i + 1} phase`}
            class="min-w-0 flex-1 cursor-pointer bg-transparent text-lg outline-none"
          >
            {#each MOTION_ORDER as motion (motion)}
              <option value={motion}>{MOTION_LABEL[motion]}</option>
            {/each}
          </select>

          <input
            type="number"
            min="1"
            max="120"
            inputmode="numeric"
            value={slot.seconds === 0 ? "" : slot.seconds}
            oninput={(event) =>
              patch(slot.id, {
                seconds: Math.min(120, Number(event.currentTarget.value) || 0),
              })}
            onblur={(event) =>
              patch(slot.id, {
                seconds: Math.max(1, Number(event.currentTarget.value) || 1),
              })}
            aria-label={`Step ${i + 1} length in seconds`}
            class="w-12 bg-transparent text-right text-lg tabular-nums outline-none"
          />
          <span class="w-3 text-sm text-ink-faint">s</span>

          <button
            type="button"
            onclick={() => removeSlot(slot.id)}
            disabled={config.slots.length <= 1}
            aria-label={`Remove step ${i + 1}`}
            class="-my-2.5 w-8 shrink-0 touch-manipulation py-2.5 text-ink-faint transition-colors hover:text-accent disabled:opacity-25 disabled:hover:text-ink-faint"
          >
            ×
          </button>
        </li>
      {/each}
    </ul>

    <div class="mt-2 flex items-baseline gap-6">
      <button
        type="button"
        onclick={addSlot}
        class="touch-manipulation py-2 text-sm text-ink-soft transition-colors hover:text-accent"
      >
        + add step
      </button>
      <button
        type="button"
        onclick={savePreset}
        class="touch-manipulation py-2 text-sm text-ink-soft transition-colors hover:text-accent"
      >
        save rhythm
      </button>
    </div>

    <div class="mt-10 flex items-baseline gap-3">
      <label for="total" class="text-ink-soft">for</label>
      <input
        id="total"
        type="number"
        min="1"
        max="120"
        inputmode="numeric"
        value={config.totalMinutes === 0 ? "" : config.totalMinutes}
        oninput={(event) =>
          onChange({
            ...config,
            totalMinutes: Math.min(
              120,
              Number(event.currentTarget.value) || 0,
            ),
          })}
        onblur={(event) =>
          onChange({
            ...config,
            totalMinutes: Math.max(
              1,
              Number(event.currentTarget.value) || 1,
            ),
          })}
        class="w-14 border-b border-rule bg-transparent pb-1 font-display text-3xl tabular-nums outline-none focus:border-accent"
      />
      <span class="text-ink-soft">minutes</span>
    </div>

    <p class="mt-3 text-sm text-ink-faint">
      {#if ready}
        {cycle}s per round · {rounds} rounds · runs {formatClock(planned)}
      {:else}
        Give every step at least one second.
      {/if}
    </p>

    <div class="mt-10 flex flex-wrap items-center gap-x-7 gap-y-2">
      <button
        type="button"
        onclick={onStart}
        disabled={!ready}
        class="touch-manipulation bg-accent px-9 py-3.5 text-paper transition-opacity hover:opacity-85 disabled:opacity-30"
      >
        Begin
      </button>

      <label class="flex cursor-pointer touch-manipulation items-center gap-2 py-2 text-sm text-ink-soft select-none">
        <input
          type="checkbox"
          checked={config.sound}
          onchange={(event) =>
            onChange({ ...config, sound: event.currentTarget.checked })}
          class="size-4 accent-[var(--accent)]"
        />
        tone
      </label>

      <label class="flex cursor-pointer touch-manipulation items-center gap-2 py-2 text-sm text-ink-soft select-none">
        <input
          type="checkbox"
          checked={config.voice}
          onchange={(event) =>
            onChange({ ...config, voice: event.currentTarget.checked })}
          class="size-4 accent-[var(--accent)]"
        />
        voiceover
      </label>
    </div>
  </div>
</main>
