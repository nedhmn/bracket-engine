import { calculateRecommendedRounds } from "../../formats/swiss/pairing.ts";
import { insertBracket } from "../bracket.ts";
import { TournamentError } from "../errors.ts";
import { draft, findPhase, openedEvents } from "../state.ts";
import { pairNextRound } from "../swiss.ts";
import type { ActionResult, Tournament, TournamentEvent } from "../types.ts";

export type StartTournamentInput = {
  seeding: string[];
};

function isPermutation(seeding: string[], ids: string[]): boolean {
  const expected = new Set(ids);
  return (
    seeding.length === ids.length &&
    new Set(seeding).size === ids.length &&
    seeding.every((id) => expected.has(id))
  );
}

export function startTournament(tournament: Tournament, input: StartTournamentInput): ActionResult {
  if (tournament.status !== "pending") {
    throw new TournamentError("already_started");
  }
  const first = tournament.phases.toSorted((a, b) => a.position - b.position)[0];
  if (!first) {
    throw new TournamentError("no_phases");
  }
  const active = tournament.participants.filter((p) => p.status === "active").map((p) => p.id);
  if (active.length < 2) {
    throw new TournamentError("not_enough_participants");
  }
  if (!isPermutation(input.seeding, active)) {
    throw new TournamentError("invalid_seeding");
  }

  const next = draft(tournament);
  const phase = findPhase(next, first.id);
  const events: TournamentEvent[] = [
    { type: "tournament_started", tournamentId: next.id },
    { type: "phase_started", phaseId: phase.id },
  ];
  next.phaseParticipants.push(
    ...input.seeding.map((participantId, i) => ({
      phaseId: phase.id,
      participantId,
      seed: i + 1,
      finalStanding: null,
    })),
  );

  if (phase.format === "swiss") {
    phase.rounds = phase.rounds ?? calculateRecommendedRounds(active.length);
    pairNextRound(next, phase, events);
  } else {
    insertBracket(next, phase.id, phase.format, phase.grandFinalType ?? "double");
  }
  phase.status = "underway";
  next.status = "underway";

  events.push(...openedEvents(tournament, next));
  return { tournament: next, events };
}
