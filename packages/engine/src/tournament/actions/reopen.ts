import { reopenCascade } from "../bracket.ts";
import { TournamentError, type TournamentErrorCode } from "../errors.ts";
import { draft, findMatch, findPhase, openedEvents } from "../state.ts";
import type { ActionResult, Tournament, TournamentEvent } from "../types.ts";

export type ReopenResultInput = {
  matchId: string;
};

const reopenBlocker = (
  tournament: Tournament,
  input: ReopenResultInput,
): TournamentErrorCode | null => {
  const match = findMatch(tournament, input.matchId);
  const phase = findPhase(tournament, match.phaseId);
  if (phase.status === "complete") {
    return "phase_complete";
  }
  // Later swiss pairings were derived from this result
  if (
    phase.format === "swiss" &&
    phase.currentRound !== null &&
    match.roundNumber < phase.currentRound
  ) {
    return "later_round_paired";
  }
  if (
    tournament.participants.some(
      (p) => p.status === "dropped" && (p.id === match.player1Id || p.id === match.player2Id),
    )
  ) {
    return "dropped_participant";
  }
  // Reopening a bye strands a one-player match
  if (match.status === "bye") {
    return "bye_not_reopenable";
  }
  if (match.status !== "complete") {
    return "match_not_complete";
  }
  return null;
};

export const canReopenResult = (tournament: Tournament, input: ReopenResultInput): boolean =>
  reopenBlocker(tournament, input) === null;

export function reopenResult(tournament: Tournament, input: ReopenResultInput): ActionResult {
  const blocker = reopenBlocker(tournament, input);
  if (blocker !== null) {
    throw new TournamentError(blocker);
  }
  const match = findMatch(tournament, input.matchId);

  const next = draft(tournament);
  reopenCascade(next, findMatch(next, match.id));
  const events: TournamentEvent[] = [{ type: "match_reopened", matchId: match.id }];
  events.push(...openedEvents(tournament, next));
  return { tournament: next, events };
}
