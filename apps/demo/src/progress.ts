import type { Match, Phase, Tournament } from "tournament-engine";

import { activePhase, phaseMatches, roundName } from "./lookup.ts";
import { type Plan, presetInfo } from "./plan.ts";

export type Next =
  | { kind: "play"; phase: Phase }
  | { kind: "cut"; size: number }
  | { kind: "end"; phase: Phase }
  | { kind: "done" };

export function nextStep(tournament: Tournament, plan: Plan | null): Next {
  const phase = activePhase(tournament);
  if (tournament.status === "complete" || phase === undefined) {
    return { kind: "done" };
  }
  if (tournament.matches.some((m) => m.phaseId === phase.id && m.status === "open")) {
    return { kind: "play", phase };
  }
  const cut = plan === null ? null : presetInfo(plan.preset).cut;
  if (phase.format === "swiss" && cut !== null && tournament.phases.length === 1) {
    return { kind: "cut", size: plan?.topCut ?? 8 };
  }
  return { kind: "end", phase };
}

export function roundMatches(tournament: Tournament, phase: Phase): Match[] {
  const open = phaseMatches(tournament, phase.id).filter((m) => m.status === "open");
  return phase.format === "swiss" ? open.filter((m) => m.roundNumber === phase.currentRound) : open;
}

export function randomWinner(match: Match): string | null {
  const players = [match.player1Id, match.player2Id].filter((id) => id !== null);
  return players.at(Math.floor(Math.random() * players.length)) ?? null;
}

export function phaseHeading(tournament: Tournament, phase: Phase): string {
  const label = phase.format === "swiss" ? "Swiss" : phase.position > 1 ? "Top cut" : "Bracket";
  if (tournament.status === "complete") {
    return `${label} · Complete`;
  }
  if (phase.format === "swiss") {
    const round = phase.currentRound ?? 1;
    return `Swiss · Round ${round} of ${phase.rounds ?? round}`;
  }
  const matches = phaseMatches(tournament, phase.id);
  const first = matches
    .filter((m) => m.status === "open")
    .toSorted((a, b) => a.matchNumber - b.matchNumber)
    .at(0);
  if (first === undefined) {
    return label;
  }
  const section = matches.filter((m) => m.bracketSection === first.bracketSection);
  const rounds = Math.max(...section.map((m) => m.roundNumber));
  return `${label} · ${roundName(phase.format, first.bracketSection, first.roundNumber, rounds)}`;
}
