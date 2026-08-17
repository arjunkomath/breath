"use client";

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
} from "../_lib/breath";

type Props = {
  config: Config;
  onChange: (next: Config) => void;
  onStart: () => void;
};

export default function Setup({ config, onChange, onStart }: Props) {
  const { slots, totalMinutes } = config;
  const cycle = cycleSeconds(slots);
  const planned = plannedSeconds(slots, totalMinutes);
  const rounds = cycle > 0 ? Math.round(planned / cycle) : 0;
  const ready = cycle > 0 && totalMinutes > 0;

  const patch = (id: string, next: Partial<Slot>) =>
    onChange({
      ...config,
      slots: slots.map((slot) => (slot.id === id ? { ...slot, ...next } : slot)),
    });

  const addSlot = () =>
    onChange({
      ...config,
      slots: [...slots, { id: uid(), seconds: 4, motion: "hold" }],
    });

  const removeSlot = (id: string) =>
    onChange({ ...config, slots: slots.filter((slot) => slot.id !== id) });

  const applyPreset = (preset: { slots: Omit<Slot, "id">[] }) =>
    onChange({
      ...config,
      slots: preset.slots.map((slot) => ({ ...slot, id: uid() })),
    });

  const savePreset = () => {
    const name = window.prompt("Name this rhythm")?.trim();
    if (!name) return;

    onChange({
      ...config,
      customPresets: [
        ...config.customPresets,
        {
          id: uid(),
          name,
          slots: slots.map(({ seconds, motion }) => ({
            seconds,
            motion,
          })),
        },
      ],
    });
  };

  const removePreset = (id: string) =>
    onChange({
      ...config,
      customPresets: config.customPresets.filter((preset) => preset.id !== id),
    });

  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-14 sm:px-12">
      <div className="w-full max-w-lg sm:ml-[8vw]">
        <h1 className="font-display text-5xl sm:text-6xl">
          Breath
        </h1>

        <div className="mt-11">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="group touch-manipulation py-1.5 text-sm text-ink-soft transition-colors hover:text-accent"
              >
                {preset.name}
                <span className="ml-1.5 text-ink-faint group-hover:text-accent/70">
                  {preset.hint}
                </span>
              </button>
            ))}
          </div>

          {config.customPresets.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1">
              <span className="py-1.5 text-xs tracking-widest text-ink-faint uppercase">
                saved
              </span>
              {config.customPresets.map((preset) => (
                <span key={preset.id} className="flex items-baseline">
                  <button
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="group touch-manipulation py-1.5 text-sm text-ink-soft transition-colors hover:text-accent"
                  >
                    {preset.name}
                    <span className="ml-1.5 text-ink-faint group-hover:text-accent/70">
                      {preset.slots.map((slot) => slot.seconds).join("·")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removePreset(preset.id)}
                    aria-label={`Delete ${preset.name} preset`}
                    title={`Delete ${preset.name}`}
                    className="touch-manipulation px-1.5 py-1.5 text-ink-faint transition-colors hover:text-accent"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <ul className="mt-6 border-t border-rule">
          {slots.map((slot, i) => (
            <li
              key={slot.id}
              className="flex items-center gap-2 border-b border-rule py-2.5 sm:gap-3"
            >
              <select
                value={slot.motion}
                onChange={(e) =>
                  patch(slot.id, { motion: e.target.value as Slot["motion"] })
                }
                aria-label={`Step ${i + 1} phase`}
                className="min-w-0 flex-1 cursor-pointer bg-transparent text-lg outline-none"
              >
                {MOTION_ORDER.map((motion) => (
                  <option key={motion} value={motion}>
                    {MOTION_LABEL[motion]}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                max={120}
                inputMode="numeric"
                value={slot.seconds === 0 ? "" : slot.seconds}
                onChange={(e) =>
                  patch(slot.id, { seconds: Math.min(120, Number(e.target.value) || 0) })
                }
                onBlur={(e) =>
                  patch(slot.id, { seconds: Math.max(1, Number(e.target.value) || 1) })
                }
                aria-label={`Step ${i + 1} length in seconds`}
                className="w-12 bg-transparent text-right text-lg tabular-nums outline-none"
              />
              <span className="w-3 text-sm text-ink-faint">s</span>

              <button
                type="button"
                onClick={() => removeSlot(slot.id)}
                disabled={slots.length <= 1}
                aria-label={`Remove step ${i + 1}`}
                className="-my-2.5 w-8 shrink-0 touch-manipulation py-2.5 text-ink-faint transition-colors hover:text-accent disabled:opacity-25 disabled:hover:text-ink-faint"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-2 flex items-baseline gap-6">
          <button
            type="button"
            onClick={addSlot}
            className="touch-manipulation py-2 text-sm text-ink-soft transition-colors hover:text-accent"
          >
            + add step
          </button>
          <button
            type="button"
            onClick={savePreset}
            className="touch-manipulation py-2 text-sm text-ink-soft transition-colors hover:text-accent"
          >
            save rhythm
          </button>
        </div>

        <div className="mt-10 flex items-baseline gap-3">
          <label htmlFor="total" className="text-ink-soft">
            for
          </label>
          <input
            id="total"
            type="number"
            min={1}
            max={120}
            inputMode="numeric"
            value={totalMinutes === 0 ? "" : totalMinutes}
            onChange={(e) =>
              onChange({
                ...config,
                totalMinutes: Math.min(120, Number(e.target.value) || 0),
              })
            }
            onBlur={(e) =>
              onChange({
                ...config,
                totalMinutes: Math.max(1, Number(e.target.value) || 1),
              })
            }
            className="w-14 border-b border-rule bg-transparent pb-1 font-display text-3xl tabular-nums outline-none focus:border-accent"
          />
          <span className="text-ink-soft">minutes</span>
        </div>

        <p className="mt-3 text-sm text-ink-faint">
          {ready ? (
            <>
              {cycle}s per round · {rounds} rounds · runs {formatClock(planned)}
            </>
          ) : (
            <>Give every step at least one second.</>
          )}
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-2">
          <button
            type="button"
            onClick={onStart}
            disabled={!ready}
            className="touch-manipulation bg-accent px-9 py-3.5 text-paper transition-opacity hover:opacity-85 disabled:opacity-30"
          >
            Begin
          </button>

          <label className="flex cursor-pointer touch-manipulation items-center gap-2 py-2 text-sm text-ink-soft select-none">
            <input
              type="checkbox"
              checked={config.sound}
              onChange={(e) => onChange({ ...config, sound: e.target.checked })}
              className="size-4 accent-[var(--accent)]"
            />
            tone
          </label>

          <label className="flex cursor-pointer touch-manipulation items-center gap-2 py-2 text-sm text-ink-soft select-none">
            <input
              type="checkbox"
              checked={config.voice}
              onChange={(e) => onChange({ ...config, voice: e.target.checked })}
              className="size-4 accent-[var(--accent)]"
            />
            voiceover
          </label>
        </div>
      </div>
    </main>
  );
}
