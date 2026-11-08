import type { EliminationFormat, GrandFinalType, PhaseFormat } from "tournament-engine";

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
    label: "Single elimination",
    copy: "Lose once and you're out.",
    format: "single_elimination",
    cut: null,
  },
  {
    value: "double",
    label: "Double elimination",
    copy: "Lose twice and you're out.",
    format: "double_elimination",
    cut: null,
  },
  {
    value: "swiss",
    label: "Swiss",
    copy: "Each round pairs players with the same record.",
    format: "swiss",
    cut: null,
  },
  {
    value: "swiss_single",
    label: "Swiss → Single elimination",
    copy: "Swiss rounds, then a single elimination top cut.",
    format: "swiss",
    cut: "single_elimination",
  },
  {
    value: "swiss_double",
    label: "Swiss → Double elimination",
    copy: "Swiss rounds, then a double elimination top cut.",
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
