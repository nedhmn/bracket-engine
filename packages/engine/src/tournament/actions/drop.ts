import { advanceMatch } from "../bracket.ts";
import { TournamentError } from "../errors.ts";
import { draft, findMatch, openedEvents } from "../state.ts";
import { maybeAdvanceRound } from "../swiss.ts";
import type { ActionResult, Tournament, TournamentEvent } from "../types.ts";

export type DropParticipantInput = {
  participantId: string;
};

export function dropParticipant(tournament: Tournament, input: DropParticipantInput): ActionResult {
  const { participantId } = input;
  const participant = tournament.participants.find((p) => p.id === participantId);
  if (!participant) {
    throw new TournamentError("participant_not_found");
  }
  if (participant.status === "dropped") {
    throw new TournamentError("already_dropped");
  }
  if (tournament.status === "complete") {
    throw new TournamentError("tournament_complete", "Cannot drop from a completed tournament");
  }

  const next = draft(tournament);
  if (tournament.status === "pending") {
    next.participants = next.participants.filter((p) => p.id !== participantId);
    return { tournament: next, events: [{ type: "participant_removed", participantId }] };
  }

  const dropped = next.participants.find((p) => p.id === participantId);
  if (dropped) {
    dropped.status = "dropped";
  }
  const events: TournamentEvent[] = [{ type: "participant_dropped", participantId }];
  const open = next.matches
    .filter(
      (m) =>
        m.status === "open" && (m.player1Id === participantId || m.player2Id === participantId),
    )
    .map((m) => m.id);
  for (const id of open) {
    const match = findMatch(next, id);
    const opponentId = match.player1Id === participantId ? match.player2Id : match.player1Id;
    if (opponentId) {
      advanceMatch(next, match, opponentId, true, events);
      maybeAdvanceRound(next, match.phaseId, match.roundNumber, events);
    }
  }
  events.push(...openedEvents(tournament, next));
  return { tournament: next, events };
}
