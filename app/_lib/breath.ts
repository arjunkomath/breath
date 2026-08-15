export type Motion = "expand" | "hold" | "contract";

export type Slot = {
  id: string;
  label: string;
  seconds: number;
  motion: Motion;
};

export type Config = {
  slots: Slot[];
  totalMinutes: number;
  sound: boolean;
};

export const MOTION_ORDER: Motion[] = ["expand", "hold", "contract"];

export const MOTION_GLYPH: Record<Motion, string> = {
  expand: "↑",
  hold: "—",
  contract: "↓",
};

export const MOTION_NAME: Record<Motion, string> = {
  expand: "expands",
  hold: "holds",
  contract: "contracts",
};

export function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

// Fixed ids so the server and client render identical markup on first paint.
export const DEFAULT_CONFIG: Config = {
  slots: [
    { id: "d1", label: "Inhale", seconds: 4, motion: "expand" },
    { id: "d2", label: "Exhale", seconds: 6, motion: "contract" },
  ],
  totalMinutes: 5,
  sound: true,
};

export const PRESETS: { name: string; hint: string; slots: Omit<Slot, "id">[] }[] = [
  {
    name: "Box",
    hint: "4·4·4·4",
    slots: [
      { label: "Inhale", seconds: 4, motion: "expand" },
      { label: "Hold", seconds: 4, motion: "hold" },
      { label: "Exhale", seconds: 4, motion: "contract" },
      { label: "Hold", seconds: 4, motion: "hold" },
    ],
  },
  {
    name: "4-7-8",
    hint: "unwind",
    slots: [
      { label: "Inhale", seconds: 4, motion: "expand" },
      { label: "Hold", seconds: 7, motion: "hold" },
      { label: "Exhale", seconds: 8, motion: "contract" },
    ],
  },
  {
    name: "Coherent",
    hint: "5·5",
    slots: [
      { label: "Inhale", seconds: 5, motion: "expand" },
      { label: "Exhale", seconds: 5, motion: "contract" },
    ],
  },
];

export function cycleSeconds(slots: Slot[]) {
  return slots.reduce((sum, s) => sum + s.seconds, 0);
}

/**
 * Sessions always end on a cycle boundary, so the requested total is rounded up
 * to the next whole cycle rather than cutting a breath in half.
 */
export function plannedSeconds(slots: Slot[], totalMinutes: number) {
  const cycle = cycleSeconds(slots);
  if (cycle <= 0) return 0;
  return Math.max(1, Math.ceil((totalMinutes * 60) / cycle)) * cycle;
}

export type Phase = {
  index: number;
  cycle: number;
  within: number;
  slotElapsed: number;
};

export function phaseAt(slots: Slot[], elapsed: number, cycle: number): Phase {
  const within = elapsed % cycle;
  let acc = 0;
  for (let i = 0; i < slots.length; i++) {
    const next = acc + slots[i].seconds;
    if (within < next || i === slots.length - 1) {
      return {
        index: i,
        cycle: Math.floor(elapsed / cycle),
        within,
        slotElapsed: within - acc,
      };
    }
    acc = next;
  }
  return { index: 0, cycle: 0, within, slotElapsed: within };
}

function endScale(motion: Motion, current: number) {
  if (motion === "expand") return 1;
  if (motion === "contract") return 0;
  return current;
}

/**
 * Per-slot start/end fullness. A first pass settles the value a full cycle ends
 * on, so the ramps loop seamlessly even when a pattern opens on a hold.
 */
export function scaleRamps(slots: Slot[]) {
  let current = 0;
  for (const slot of slots) current = endScale(slot.motion, current);

  return slots.map((slot) => {
    const from = current;
    current = endScale(slot.motion, current);
    return { from, to: current };
  });
}

export function easeInOutSine(t: number) {
  return 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, t))) / 2;
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const STORAGE_KEY = "breath.config.v1";

export function loadConfig(): Config | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Config;
    if (!Array.isArray(parsed?.slots) || parsed.slots.length === 0) return null;

    return {
      slots: parsed.slots.map((slot) => ({
        id: typeof slot.id === "string" ? slot.id : uid(),
        label: typeof slot.label === "string" ? slot.label : "Breathe",
        seconds: Number(slot.seconds) || 1,
        motion: MOTION_ORDER.includes(slot.motion) ? slot.motion : "hold",
      })),
      totalMinutes: Number(parsed.totalMinutes) || 5,
      sound: parsed.sound !== false,
    };
  } catch {
    return null;
  }
}

function saveConfig(config: Config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Private browsing or a full quota — settings just won't persist.
  }
}

/**
 * localStorage is the source of truth, exposed as an external store so the
 * server renders defaults and the client swaps in saved settings on hydration.
 */
let cached = DEFAULT_CONFIG;
let read = false;
const listeners = new Set<() => void>();

export function subscribeConfig(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getConfig() {
  if (!read) {
    read = true;
    cached = loadConfig() ?? DEFAULT_CONFIG;
  }
  return cached;
}

export function getServerConfig() {
  return DEFAULT_CONFIG;
}

export function setConfig(next: Config) {
  cached = next;
  saveConfig(next);
  for (const listener of listeners) listener();
}
