import type { Match, Phase, PhaseFormat, Tournament } from "tournament-engine";

const ESCAPES = new Map([
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&#39;"],
]);

export function esc(text: string | number): string {
  return String(text).replace(/[&<>"']/g, (c) => ESCAPES.get(c) ?? c);
}

export const FORMAT_LABELS: ReadonlyMap<PhaseFormat, string> = new Map([
  ["swiss", "Swiss"],
  ["single_elimination", "Single elimination"],
  ["double_elimination", "Double elimination"],
]);

export function formatLabel(format: PhaseFormat): string {
  return FORMAT_LABELS.get(format) ?? format;
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
