import type {
  EliminationFormat,
  GrandFinalType,
  Match,
  Phase,
  PhaseFormat,
  Tournament,
} from "tournament-engine";

export type Option<T extends string> = readonly [T, string];

export const FORMATS: readonly Option<PhaseFormat>[] = [
  ["swiss", "Swiss"],
  ["single_elimination", "Single elimination"],
  ["double_elimination", "Double elimination"],
];

export const ELIMINATION_FORMATS: readonly Option<EliminationFormat>[] = [
  ["single_elimination", "Single elimination"],
  ["double_elimination", "Double elimination"],
];

export const GRAND_FINALS: readonly Option<GrandFinalType>[] = [
  ["double", "Double (bracket reset)"],
  ["simple", "Simple"],
  ["none", "None"],
];

export function formatLabel(format: PhaseFormat): string {
  return FORMATS.find(([value]) => value === format)?.[1] ?? format;
}

export function nameOf(tournament: Tournament, id: string | null): string {
  if (id === null) {
    return "TBD";
  }
  return tournament.participants.find((p) => p.id === id)?.name ?? id;
}

export function isDropped(tournament: Tournament, id: string): boolean {
  return tournament.participants.some((p) => p.id === id && p.status === "dropped");
}

export function phaseMatches(tournament: Tournament, phaseId: string): Match[] {
  return tournament.matches
    .filter((m) => m.phaseId === phaseId)
    .toSorted((a, b) => a.roundNumber - b.roundNumber || a.matchNumber - b.matchNumber);
}

export function sortedPhases(tournament: Tournament): Phase[] {
  return tournament.phases.toSorted((a, b) => a.position - b.position);
}

export function isLive(tournament: Tournament, phase: Phase): boolean {
  return tournament.status !== "complete" && phase.status !== "complete";
}

export function groupBy<K, T>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    groups.set(k, [...(groups.get(k) ?? []), item]);
  }
  return groups;
}
