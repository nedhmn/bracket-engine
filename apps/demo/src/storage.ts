import type { Tournament } from "tournament-engine";

import { parseTournament } from "./parse.ts";

// Bump the version when the Tournament shape changes; old keys are then ignored
export const STORAGE_KEY = "tournament-engine-demo/v1";

export function loadTournament(): Tournament | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const tournament = parseTournament(raw);
    if (tournament === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    return tournament;
  } catch {
    return null;
  }
}

export function saveTournament(tournament: Tournament): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament));
  } catch {
    // Storage is optional: the demo keeps running in memory
  }
}

export function clearTournament(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage is optional: the demo keeps running in memory
  }
}
