import { useSyncExternalStore } from "react";

export type LivePlatform = "Instagram" | "YouTube" | "TikTok";

export type LiveState = {
  isLive: boolean;
  platform: LivePlatform;
  url: string;
};

const STORAGE_KEY = "will3d.live";
const DEFAULT_STATE: LiveState = {
  isLive: false,
  platform: "Instagram",
  url: "https://www.instagram.com/will_design2020/",
};

let currentState: LiveState = DEFAULT_STATE;
const listeners = new Set<() => void>();

function read(): LiveState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<LiveState>) };
  } catch {
    return DEFAULT_STATE;
  }
}

function write(state: LiveState) {
  currentState = state;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l());
}

// Hydrate from storage on first client access
if (typeof window !== "undefined") {
  currentState = read();
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      currentState = read();
      listeners.forEach((l) => l());
    }
  });
}

export function setLive(next: Partial<LiveState>) {
  write({ ...currentState, ...next });
}

export function useLive(): LiveState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentState,
    () => DEFAULT_STATE,
  );
}
