import { TournamentError } from "./errors.ts";
import type { Match, Phase, PhaseParticipant, Tournament, TournamentEvent } from "./types.ts";

export function draft(tournament: Tournament): Tournament {
  return {
    ...tournament,
    participants: tournament.participants.map((p) => ({ ...p })),
    phases: tournament.phases.map((p) => ({ ...p })),
    phaseParticipants: tournament.phaseParticipants.map((p) => ({ ...p })),
    matches: tournament.matches.map((m) => ({ ...m })),
  };
}

export function findPhase(tournament: Tournament, phaseId: string): Phase {
  const phase = tournament.phases.find((p) => p.id === phaseId);
  if (!phase) {
    throw new TournamentError("phase_not_found");
  }
  return phase;
}

export function findMatch(tournament: Tournament, matchId: string): Match {
  const match = tournament.matches.find((m) => m.id === matchId);
  if (!match) {
    throw new TournamentError("match_not_found");
  }
  return match;
}

export function latestPhase(tournament: Tournament): Phase {
  const phase = tournament.phases.toSorted((a, b) => b.position - a.position)[0];
  if (!phase) {
    throw new TournamentError("no_phases");
  }
  return phase;
}

export function phaseMatches(tournament: Tournament, phaseId: string): Match[] {
  return tournament.matches
    .filter((m) => m.phaseId === phaseId)
    .toSorted((a, b) => a.matchNumber - b.matchNumber);
}

export function phaseSeeds(tournament: Tournament, phaseId: string): PhaseParticipant[] {
  return tournament.phaseParticipants
    .filter((p) => p.phaseId === phaseId)
    .toSorted((a, b) => a.seed - b.seed);
}

export function phaseIdAt(position: number): string {
  return `phase${position}`;
}

export function matchIdFor(phaseId: string, matchNumber: number): string {
  return `${phaseId}-m${matchNumber}`;
}

export function isUnresolved(match: Match): boolean {
  return match.status === "open" || match.status === "pending";
}

export function openedEvents(before: Tournament, after: Tournament): TournamentEvent[] {
  const wasOpen = new Set(before.matches.filter((m) => m.status === "open").map((m) => m.id));
  return after.matches
    .filter((m) => m.status === "open" && !wasOpen.has(m.id))
    .map((m): TournamentEvent => ({ type: "match_opened", matchId: m.id }));
}
