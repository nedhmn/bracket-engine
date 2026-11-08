import type { EliminationFormat, GrandFinalType, PhaseFormat, Tournament } from "tournament-engine";

import type { Option } from "./lookup.ts";

export type Preset = "single" | "double" | "swiss" | "swiss_single" | "swiss_double";

type PresetInfo = {
  copy: string;
  cut: EliminationFormat | null;
  format: PhaseFormat;
  label: string;
  value: Preset;
};

export const PRESETS: readonly PresetInfo[] = [
  {
    value: "single",
    label: "Single elim",
    copy: "Lose once and you're out.",
    format: "single_elimination",
    cut: null,
  },
  {
    value: "double",
    label: "Double elim",
    copy: "Lose twice and you're out. First losses drop to a losers bracket.",
    format: "double_elimination",
    cut: null,
  },
  {
    value: "swiss",
    label: "Swiss",
    copy: "Every round pairs players with the same record.",
    format: "swiss",
    cut: null,
  },
  {
    value: "swiss_single",
    label: "Swiss → Single elim",
    copy: "Swiss rounds, then the top cut plays single elimination.",
    format: "swiss",
    cut: "single_elimination",
  },
  {
    value: "swiss_double",
    label: "Swiss → Double elim",
    copy: "Swiss rounds, then the top cut plays double elimination.",
    format: "swiss",
    cut: "double_elimination",
  },
];

export const GRAND_FINALS: readonly Option<GrandFinalType>[] = [
  ["simple", "Simple"],
  ["double", "Reset"],
  ["none", "None"],
];

export const PLAYER_PICKS: readonly number[] = [4, 8, 16, 32];
export const TOP_CUTS: readonly number[] = [4, 8, 16];

export type Plan = {
  grandFinal: GrandFinalType;
  players: number;
  preset: Preset;
  topCut: number;
};

export function presetInfo(preset: Preset): PresetInfo {
  return PRESETS.find((p) => p.value === preset) ?? PRESETS[0];
}

export function usesGrandFinal(preset: Preset): boolean {
  return preset === "double" || preset === "swiss_double";
}

export function planName(plan: Plan): string {
  return `${presetInfo(plan.preset).label} · ${plan.players} players`;
}

const PLAN_KEY = "tournament-engine-demo/plan";
const ONBOARDED_KEY = "tournament-engine-demo/onboarded";

function parsePlan(raw: string): Plan | null {
  const [preset, players, grandFinal, topCut] = raw.split(":");
  const known = PRESETS.find((p) => p.value === preset)?.value;
  const final = GRAND_FINALS.find(([g]) => g === grandFinal)?.[0];
  const count = Number(players);
  const cut = Number(topCut);
  if (known === undefined || final === undefined || !Number.isInteger(count + cut)) {
    return null;
  }
  return { preset: known, players: count, grandFinal: final, topCut: cut };
}

export function fallbackPlan(tournament: Tournament): Plan {
  const format = tournament.phases.find((p) => p.position === 1)?.format;
  const preset = PRESETS.find((p) => p.cut === null && p.format === format)?.value ?? "swiss";
  return { preset, players: tournament.participants.length, grandFinal: "double", topCut: 8 };
}

export function loadPlan(): Plan | null {
  try {
    const raw = window.localStorage.getItem(PLAN_KEY);
    return raw === null ? null : parsePlan(raw);
  } catch {
    return null;
  }
}

export function savePlan(plan: Plan | null): void {
  try {
    if (plan === null) {
      window.localStorage.removeItem(PLAN_KEY);
    } else {
      window.localStorage.setItem(
        PLAN_KEY,
        [plan.preset, plan.players, plan.grandFinal, plan.topCut].join(":"),
      );
    }
  } catch {
    // Storage is optional: the demo keeps running in memory
  }
}

export function isOnboarded(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDED_KEY) !== null;
  } catch {
    return false;
  }
}

export function markOnboarded(): void {
  try {
    window.localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    // Storage is optional: onboarding shows again next visit
  }
}
