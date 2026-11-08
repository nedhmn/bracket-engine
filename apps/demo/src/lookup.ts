import type { BracketSection, Match, Phase, PhaseFormat, Tournament } from "tournament-engine";

export type Option<T extends string> = readonly [T, string];

export function nameOf(tournament: Tournament, id: string | null): string {
  if (id === null) {
    return "TBD";
  }
  return tournament.participants.find((p) => p.id === id)?.name ?? id;
}

export function isActive(tournament: Tournament, id: string): boolean {
  return tournament.participants.some((p) => p.id === id && p.status === "active");
}

export function phaseMatches(tournament: Tournament, phaseId: string): Match[] {
  return tournament.matches
    .filter((m) => m.phaseId === phaseId)
    .toSorted((a, b) => a.roundNumber - b.roundNumber || a.matchNumber - b.matchNumber);
}

export function sortedPhases(tournament: Tournament): Phase[] {
  return tournament.phases.toSorted((a, b) => a.position - b.position);
}

export function activePhase(tournament: Tournament): Phase | undefined {
  return sortedPhases(tournament).findLast((p) => p.status !== "pending");
}

export function groupBy<K, T>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    groups.set(k, [...(groups.get(k) ?? []), item]);
  }
  return groups;
}

export function roundName(
  format: PhaseFormat,
  section: BracketSection | null,
  round: number,
  rounds: number,
): string {
  if (section === "grand_final") {
    return round === 1 ? "Grand final" : "Grand final reset";
  }
  if (format === "single_elimination") {
    const fromEnd = rounds - round;
    return ["Final", "Semifinals", "Quarterfinals"].at(fromEnd) ?? `Round ${round}`;
  }
  const name = round === rounds ? "final" : `round ${round}`;
  return `${section === "losers" ? "Losers" : "Winners"} ${name}`;
}

export function phaseSeeds(tournament: Tournament, phaseId: string): Map<string, number> {
  return new Map(
    tournament.phaseParticipants
      .filter((p) => p.phaseId === phaseId)
      .map((p) => [p.participantId, p.seed]),
  );
}
