import { advanceMatch } from "../bracket.ts";
import { TournamentError } from "../errors.ts";
import { draft, findMatch, findPhase, openedEvents } from "../state.ts";
import { maybeAdvanceRound } from "../swiss.ts";
import type { ActionResult, Tournament, TournamentEvent } from "../types.ts";

export type ReportResultInput = {
  matchId: string;
  winnerId: string;
};

export function reportResult(tournament: Tournament, input: ReportResultInput): ActionResult {
  const next = draft(tournament);
  const match = findMatch(next, input.matchId);
  if (findPhase(next, match.phaseId).status === "complete") {
    throw new TournamentError("phase_complete");
  }
  const events: TournamentEvent[] = [];
  advanceMatch(next, match, input.winnerId, false, events);
  maybeAdvanceRound(next, match.phaseId, match.roundNumber, events);
  events.push(...openedEvents(tournament, next));
  return { tournament: next, events };
}
