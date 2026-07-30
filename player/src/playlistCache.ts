import type { NormalizedZone } from "./types";

const KEY = "carteleria.player.lastZones";

export function saveLastZones(zones: NormalizedZone[]): void {
  localStorage.setItem(KEY, JSON.stringify(zones));
}

export function loadLastZones(): NormalizedZone[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as NormalizedZone[]) : null;
  } catch {
    return null;
  }
}

export function clearLastZones(): void {
  localStorage.removeItem(KEY);
}
