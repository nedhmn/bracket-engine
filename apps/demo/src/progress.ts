import type { Match, Phase, Tournament } from "tournament-engine";

import { activePhase, nameOf, phaseMatches, roundName } from "./lookup.ts";
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

function reported(matches: Match[]): string {
  const counted = matches.filter((m) => m.status !== "bye" && m.status !== "unreachable");
  const done = counted.filter((m) => m.status === "complete").length;
  return `${done} of ${counted.length} reported`;
}

function playStatus(tournament: Tournament, phase: Phase): string {
  const matches = phaseMatches(tournament, phase.id);
  if (phase.format === "swiss") {
    const round = phase.currentRound ?? 1;
    const inRound = matches.filter((m) => m.roundNumber === round);
    return `Round ${round} of ${phase.rounds ?? round} · ${reported(inRound)}`;
  }
  const first = matches
    .filter((m) => m.status === "open")
    .toSorted((a, b) => a.matchNumber - b.matchNumber)
    .at(0);
  if (first === undefined) {
    return "";
  }
  const section = matches.filter((m) => m.bracketSection === first.bracketSection);
  const rounds = Math.max(...section.map((m) => m.roundNumber));
  const name = roundName(phase.format, first.bracketSection, first.roundNumber, rounds);
  const prefix = phase.position > 1 ? "Top cut · " : "";
  return `${prefix}${name} · ${reported(section.filter((m) => m.roundNumber === first.roundNumber))}`;
}

export function statusLine(tournament: Tournament, next: Next): string {
  switch (next.kind) {
    case "done": {
      const winner = tournament.participants.find((p) => p.finalStanding === 1);
      return winner === undefined
        ? "Complete."
        : `Complete. ${nameOf(tournament, winner.id)} wins.`;
    }
    case "cut":
      return `Swiss is done. Create the top ${next.size}.`;
    case "end":
      if (next.phase.format === "swiss") {
        return "Swiss is done. End the tournament to lock in standings.";
      }
      return `${next.phase.position > 1 ? "Top cut" : "Bracket"} is done. End the tournament to lock in standings.`;
    case "play":
      return playStatus(tournament, next.phase);
  }
}
