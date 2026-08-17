export type Motion = "expand" | "hold" | "contract";

export type Slot = {
  id: string;
  seconds: number;
  motion: Motion;
};

export type CustomPreset = {
  id: string;
  name: string;
  slots: Omit<Slot, "id">[];
};

export type Config = {
  slots: Slot[];
  totalMinutes: number;
  sound: boolean;
  voice: boolean;
  customPresets: CustomPreset[];
};

export const MOTION_ORDER: Motion[] = ["expand", "hold", "contract"];

export const MOTION_LABEL: Record<Motion, string> = {
  expand: "Inhale",
  hold: "Hold",
  contract: "Exhale",
};

export function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

// Fixed ids so the server and client render identical markup on first paint.
export const DEFAULT_CONFIG: Config = {
  slots: [
    { id: "d1", seconds: 4, motion: "expand" },
    { id: "d2", seconds: 6, motion: "contract" },
  ],
  totalMinutes: 5,
  sound: true,
  voice: false,
  customPresets: [],
};

export const PRESETS: { name: string; hint: string; slots: Omit<Slot, "id">[] }[] = [
  {
    name: "Box",
    hint: "4·4·4·4",
    slots: [
      { seconds: 4, motion: "expand" },
      { seconds: 4, motion: "hold" },
      { seconds: 4, motion: "contract" },
      { seconds: 4, motion: "hold" },
    ],
  },
  {
    name: "4-7-8",
    hint: "unwind",
    slots: [
      { seconds: 4, motion: "expand" },
      { seconds: 7, motion: "hold" },
      { seconds: 8, motion: "contract" },
    ],
  },
  {
    name: "Coherent",
    hint: "5·5",
    slots: [
      { seconds: 5, motion: "expand" },
      { seconds: 5, motion: "contract" },
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
        slotElapsed: within - acc,
      };
    }
    acc = next;
  }
  return { index: 0, cycle: 0, slotElapsed: within };
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

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const STORAGE_KEY = "breath.config.v1";

function cleanSlot(slot: Partial<Slot>): Omit<Slot, "id"> {
  const motion = slot.motion;
  return {
    seconds: Number(slot.seconds) || 1,
    motion: motion && MOTION_ORDER.includes(motion) ? motion : "hold",
  };
}

export function loadConfig(): Config | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Config;
    if (!Array.isArray(parsed?.slots) || parsed.slots.length === 0) return null;

    return {
      slots: parsed.slots.map((slot) => ({
        id: typeof slot.id === "string" ? slot.id : uid(),
        ...cleanSlot(slot),
      })),
      totalMinutes: Number(parsed.totalMinutes) || 5,
      sound: parsed.sound !== false,
      voice: parsed.voice === true,
      customPresets: Array.isArray(parsed.customPresets)
        ? parsed.customPresets.flatMap((preset) => {
            if (
              typeof preset?.name !== "string" ||
              !Array.isArray(preset.slots) ||
              preset.slots.length === 0
            ) {
              return [];
            }

            return [
              {
                id: typeof preset.id === "string" ? preset.id : uid(),
                name: preset.name.trim() || "Saved rhythm",
                slots: preset.slots.map(cleanSlot),
              },
            ];
          })
        : [],
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
