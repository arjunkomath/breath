"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  cycleSeconds,
  easeInOutSine,
  formatClock,
  phaseAt,
  plannedSeconds,
  scaleRamps,
  type Config,
} from "../_lib/breath";
import { chime, cue, primeAudio } from "../_lib/sound";

const R = 120;
const C = 2 * Math.PI * R;

type Props = {
  config: Config;
  onExit: () => void;
  onRestart: () => void;
};

export default function Session({ config, onExit, onRestart }: Props) {
  const { slots, sound } = config;

  const cycle = useMemo(() => cycleSeconds(slots), [slots]);
  const planned = useMemo(
    () => plannedSeconds(slots, config.totalMinutes),
    [slots, config.totalMinutes],
  );
  const ramps = useMemo(() => scaleRamps(slots), [slots]);

  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);

  const baseRef = useRef(0);
  const anchorRef = useRef(0);

  useEffect(() => {
    if (paused || done) return;

    anchorRef.current = performance.now();
    let frame = requestAnimationFrame(function tick() {
      const now = baseRef.current + (performance.now() - anchorRef.current) / 1000;
      if (now >= planned) {
        setElapsed(planned);
        setDone(true);
        return;
      }
      setElapsed(now);
      frame = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(frame);
      baseRef.current = Math.min(
        planned,
        baseRef.current + (performance.now() - anchorRef.current) / 1000,
      );
    };
  }, [paused, done, planned]);

  const phase = phaseAt(slots, Math.min(elapsed, planned - 0.0001), cycle);
  const slot = slots[phase.index] ?? slots[0];
  const ramp = ramps[phase.index] ?? { from: 0, to: 1 };
  const fullness =
    ramp.from + (ramp.to - ramp.from) * easeInOutSine(phase.slotElapsed / slot.seconds);
  // The glow fades out well before its edge, so it can bleed past the ring.
  const discR = R * (0.62 + 0.53 * fullness);
  const remaining = Math.max(1, Math.ceil(slot.seconds - phase.slotElapsed));

  const phaseKey = done ? -1 : phase.cycle * slots.length + phase.index;
  const lastCued = useRef<number | null>(null);

  useEffect(() => {
    if (phaseKey < 0 || paused || lastCued.current === phaseKey) return;
    lastCued.current = phaseKey;
    if (sound) cue(slots[phaseKey % slots.length].motion);
  }, [phaseKey, paused, sound, slots]);

  useEffect(() => {
    if (done && sound) chime();
  }, [done, sound]);

  useEffect(() => {
    if (sound) primeAudio();
  }, [sound]);

  // Keeps the screen awake mid-session where the browser supports it.
  useEffect(() => {
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
  }, [done]);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (!done) setPaused((p) => !p);
    } else if (e.key === "Escape") {
      onExit();
    }
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const rounds = Math.round(planned / cycle);
  const progress = Math.min(1, elapsed / planned);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-6 sm:py-10">
      <div className="relative">
        <svg
          viewBox="-150 -150 300 300"
          className="w-[min(76vw,40vh,21rem)]"
          aria-hidden="true"
        >
          <defs>
            {/* A gradient rather than a blur filter: the same soft falloff, but
                cheap enough to resize every frame. */}
            <radialGradient id="breath-glow">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
              <stop offset="48%" stopColor="var(--accent)" stopOpacity={0.16} />
              <stop offset="76%" stopColor="var(--accent)" stopOpacity={0.06} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </radialGradient>
          </defs>

          <circle r={R} fill="none" stroke="var(--rule)" strokeWidth={1} />
          <circle
            r={R}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray={`${(phase.within / cycle) * C} ${C}`}
            transform="rotate(-90)"
            opacity={done ? 0 : 0.7}
          />
          <circle r={done ? R : discR} fill="url(#breath-glow)" />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
          {done ? (
            <>
              <p className="font-display text-3xl sm:text-4xl">Done</p>
              <p className="text-sm text-ink-soft tabular-nums">
                {formatClock(planned)} · {rounds} rounds
              </p>
            </>
          ) : (
            <>
              <p aria-live="polite" className="font-display text-3xl sm:text-4xl">
                {paused ? "Paused" : slot.label || `Step ${phase.index + 1}`}
              </p>
              <p className="text-lg text-ink-soft tabular-nums">{remaining}</p>
            </>
          )}
        </div>
      </div>

      <div className="mt-10 w-full max-w-sm sm:mt-16">
        <div className="h-px w-full bg-rule">
          <div
            className="h-px bg-accent"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-ink-faint tabular-nums">
          <span>{formatClock(elapsed)}</span>
          <span>{formatClock(planned)}</span>
        </div>
      </div>

      <div className="mt-7 flex w-full max-w-sm gap-3 sm:mt-9">
        {done ? (
          <>
            <button
              type="button"
              onClick={onRestart}
              className="flex-1 touch-manipulation bg-accent py-4 text-paper transition-opacity hover:opacity-85"
            >
              Again
            </button>
            <button
              type="button"
              onClick={onExit}
              className="flex-1 touch-manipulation border border-rule py-4 text-ink-soft transition-colors hover:border-accent hover:text-accent"
            >
              Change rhythm
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="flex-1 touch-manipulation border border-rule py-4 text-ink transition-colors hover:border-accent hover:text-accent"
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              onClick={onExit}
              className="flex-1 touch-manipulation border border-rule py-4 text-ink-soft transition-colors hover:border-accent hover:text-accent"
            >
              End
            </button>
          </>
        )}
      </div>
    </main>
  );
}
