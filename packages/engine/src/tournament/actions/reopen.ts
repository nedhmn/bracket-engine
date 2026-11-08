import { reopenCascade } from "../bracket.ts";
import { TournamentError } from "../errors.ts";
import { draft, findMatch, findPhase, openedEvents } from "../state.ts";
import type { ActionResult, Tournament, TournamentEvent } from "../types.ts";

export type ReopenResultInput = {
  matchId: string;
};

export function reopenResult(tournament: Tournament, input: ReopenResultInput): ActionResult {
  const match = findMatch(tournament, input.matchId);
  const phase = findPhase(tournament, match.phaseId);
  if (phase.status === "complete") {
    throw new TournamentError("phase_complete");
  }
  // Later swiss pairings were derived from this result
  if (
    phase.format === "swiss" &&
    phase.currentRound !== null &&
    match.roundNumber < phase.currentRound
  ) {
    throw new TournamentError("later_round_paired");
  }
  if (
    tournament.participants.some(
      (p) => p.status === "dropped" && (p.id === match.player1Id || p.id === match.player2Id),
    )
  ) {
    throw new TournamentError("dropped_participant");
  }
  // Reopening a bye strands a one-player match
  if (match.status === "bye") {
    throw new TournamentError("bye_not_reopenable");
  }
  if (match.status !== "complete") {
    throw new TournamentError("match_not_complete");
  }

  const next = draft(tournament);
  reopenCascade(next, findMatch(next, match.id));
  const events: TournamentEvent[] = [{ type: "match_reopened", matchId: match.id }];
  events.push(...openedEvents(tournament, next));
  return { tournament: next, events };
}
