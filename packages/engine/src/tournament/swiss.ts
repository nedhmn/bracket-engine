import { generateSwissRound } from "../formats/swiss/pairing.ts";
import { buildSwissStandings } from "../formats/swiss/standings.ts";
import type { MatchResult } from "../formats/types.ts";
import { findPhase, matchIdFor, phaseMatches, phaseSeeds } from "./state.ts";
import type { Match, Phase, Tournament, TournamentEvent } from "./types.ts";

const isDecided = (m: Match): boolean => m.status === "complete" || m.status === "bye";

export function swissResults(tournament: Tournament, phaseId: string): MatchResult[] {
  return phaseMatches(tournament, phaseId)
    .filter(isDecided)
    .map((m) => ({
      winnerId: m.winnerId,
      player1Id: m.player1Id ?? "",
      player2Id: m.player2Id,
      roundNumber: m.roundNumber,
    }));
}

export function pairNextRound(
  tournament: Tournament,
  phase: Phase,
  events: TournamentEvent[],
): void {
  const dropped = new Set(
    tournament.participants.filter((p) => p.status === "dropped").map((p) => p.id),
  );
  const nextRound = (phase.currentRound ?? 0) + 1;
  const standings = buildSwissStandings(
    phaseSeeds(tournament, phase.id).map((s) => ({
      participantId: s.participantId,
      dropped: dropped.has(s.participantId),
    })),
    swissResults(tournament, phase.id),
  );

  let matchNumber = Math.max(0, ...phaseMatches(tournament, phase.id).map((m) => m.matchNumber));
  for (const pairing of generateSwissRound(standings, nextRound)) {
    matchNumber++;
    const isBye = pairing.player2 === null;
    tournament.matches.push({
      id: matchIdFor(phase.id, matchNumber),
      phaseId: phase.id,
      matchNumber,
      roundNumber: nextRound,
      bracketSection: null,
      player1Id: pairing.player1,
      player2Id: pairing.player2,
      winnerId: isBye ? pairing.player1 : null,
      nextMatchId: null,
      nextMatchSlot: null,
      loserNextMatchId: null,
      loserNextMatchSlot: null,
      status: isBye ? "bye" : "open",
      forfeit: false,
    });
  }

  phase.currentRound = nextRound;
  events.push({ type: "swiss_round_paired", phaseId: phase.id, roundNumber: nextRound });
}

export function maybeAdvanceRound(
  tournament: Tournament,
  phaseId: string,
  completedRound: number,
  events: TournamentEvent[],
): void {
  const phase = findPhase(tournament, phaseId);
  if (
    phase.format !== "swiss" ||
    phase.currentRound === null ||
    phase.rounds === null ||
    phase.currentRound >= phase.rounds ||
    phase.currentRound !== completedRound
  ) {
    return;
  }
  const round = phaseMatches(tournament, phaseId).filter((m) => m.roundNumber === completedRound);
  if (round.length > 0 && round.every(isDecided)) {
    pairNextRound(tournament, phase, events);
  }
}
