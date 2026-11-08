import { TournamentError } from "../errors.ts";
import { draft } from "../state.ts";
import type { ActionResult, Tournament } from "../types.ts";

export type JoinTournamentInput = {
  name: string;
};

export function joinTournament(tournament: Tournament, input: JoinTournamentInput): ActionResult {
  if (tournament.status !== "pending") {
    throw new TournamentError("join_closed");
  }
  if (tournament.participants.some((p) => p.name === input.name)) {
    throw new TournamentError("duplicate_name");
  }
  const next = draft(tournament);
  next.participantSequence += 1;
  const participantId = `p${next.participantSequence}`;
  next.participants.push({
    id: participantId,
    name: input.name,
    status: "active",
    finalStanding: null,
  });
  return { tournament: next, events: [{ type: "participant_joined", participantId }] };
}
