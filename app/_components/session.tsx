"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  cycleSeconds,
  formatClock,
  MOTION_LABEL,
  phaseAt,
  plannedSeconds,
  scaleRamps,
  type Config,
} from "../_lib/breath";
import { chime, cue, primeAudio, voiceCue } from "../_lib/sound";

const START_DELAY = 3;
const PETAL_ANGLES = Array.from({ length: 8 }, (_, index) => index * 45);
const STACKED_ALPHA = 1 - 0.9 ** PETAL_ANGLES.length;
const CLOSED_FADE = 0.01 / STACKED_ALPHA;

type Props = {
  config: Config;
  onExit: () => void;
  onRestart: () => void;
};

export default function Session({ config, onExit, onRestart }: Props) {
  const { slots, sound, voice } = config;

  const cycle = useMemo(() => cycleSeconds(slots), [slots]);
  const planned = useMemo(
    () => plannedSeconds(slots, config.totalMinutes),
    [slots, config.totalMinutes],
  );
  const ramps = useMemo(() => scaleRamps(slots), [slots]);

  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [countdown, setCountdown] = useState(START_DELAY);

  const baseRef = useRef(0);
  const anchorRef = useRef(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = window.setTimeout(
        () => setCountdown((seconds) => seconds - 1),
        1000,
      );
      return () => window.clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (countdown > 0 || paused || done) return;

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
  }, [countdown, paused, done, planned]);

  const phase = phaseAt(slots, Math.min(elapsed, planned - 0.0001), cycle);
  const slot = slots[phase.index] ?? slots[0];
  const ramp = ramps[phase.index] ?? { from: 0, to: 1 };
  const slotProgress = Math.min(1, phase.slotElapsed / slot.seconds);
  const motionProgress =
    slot.motion === "expand"
      ? Math.sin((Math.PI / 2) * slotProgress)
      : slot.motion === "contract"
        ? 1 - Math.cos((Math.PI / 2) * slotProgress)
        : 0;
  const fullness =
    ramp.from + (ramp.to - ramp.from) * motionProgress;
  const movingSlots = slots.reduce(
    (count, item) => count + (item.motion === "hold" ? 0 : 1),
    0,
  );
  const completedMovements = slots
    .slice(0, phase.index)
    .reduce(
      (count, item) => count + (item.motion === "hold" ? 0 : 1),
      phase.cycle * movingSlots,
    );
  const rotation = ((completedMovements + motionProgress) * 180) % 360;
  const openness = done ? 0 : fullness;
  const petalOffset = (openness * 100) / 6;
  // Eight petals at 10% alpha composite to ~57% once they stack, so the group
  // is faded alongside them to leave the closed circle barely there.
  const petalFade = CLOSED_FADE + (1 - CLOSED_FADE) * openness;
  const remaining = Math.max(1, Math.ceil(slot.seconds - phase.slotElapsed));

  const phaseKey = done ? -1 : phase.cycle * slots.length + phase.index;
  const lastCued = useRef<number | null>(null);

  useEffect(() => {
    if (
      countdown > 0 ||
      phaseKey < 0 ||
      paused ||
      lastCued.current === phaseKey
    ) {
      return;
    }
    lastCued.current = phaseKey;
    if (sound) cue(slots[phaseKey % slots.length].motion);
    if (voice) voiceCue(slots[phaseKey % slots.length].motion);
  }, [countdown, phaseKey, paused, sound, slots, voice]);

  useEffect(() => {
    if (done && sound) chime();
  }, [done, sound]);

  useEffect(() => {
    if (sound || voice) primeAudio();
  }, [sound, voice]);

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
      if (countdown === 0 && !done) setPaused((p) => !p);
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
      <div className="relative size-[min(76vw,40vh,21rem)]">
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 size-full -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="2.5"
            className="stroke-accent opacity-20"
          />
          {progress > 0 && (
            // pathLength normalises the circumference, so the dash offset is
            // just the fraction of the session still to run.
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - progress}
              className="stroke-accent"
            />
          )}
        </svg>

        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{ opacity: petalFade }}
        >
          {PETAL_ANGLES.map((angle, index) => (
            <div
              key={angle}
              className={`absolute inset-0 grid place-items-center ${index === 0 ? "" : "motion-reduce:hidden"}`}
            >
              <div
                className="size-1/2 rounded-full bg-accent opacity-10 motion-reduce:!transform-none"
                style={{
                  transform: `rotate(${angle + rotation}deg) translate(${petalOffset}%, ${petalOffset}%)`,
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
          {countdown > 0 ? (
            <>
              <p className="font-display text-3xl sm:text-4xl">Ready</p>
              <p aria-live="polite" className="text-lg text-ink-soft tabular-nums">
                {countdown}
              </p>
            </>
          ) : done ? (
            <>
              <p className="font-display text-3xl sm:text-4xl">Done</p>
              <p className="text-sm text-ink-soft tabular-nums">
                {formatClock(planned)} · {rounds} rounds
              </p>
            </>
          ) : (
            <>
              <p aria-live="polite" className="font-display text-3xl sm:text-4xl">
                {paused ? "Paused" : MOTION_LABEL[slot.motion]}
              </p>
              <p className="text-lg text-ink-soft tabular-nums">{remaining}</p>
            </>
          )}
        </div>
      </div>

      <div className="mt-10 flex w-full max-w-sm justify-between text-xs text-ink-faint tabular-nums sm:mt-16">
        <span>{formatClock(elapsed)}</span>
        <span>{formatClock(planned)}</span>
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
        ) : countdown > 0 ? (
          <button
            type="button"
            onClick={onExit}
            className="flex-1 touch-manipulation border border-rule py-4 text-ink-soft transition-colors hover:border-accent hover:text-accent"
          >
            Cancel
          </button>
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
