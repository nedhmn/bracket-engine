import type { GrandFinalType } from "../../formats/types.ts";
import { insertBracket } from "../bracket.ts";
import { TournamentError } from "../errors.ts";
import { finalizePhase, swissRankings } from "../standings.ts";
import {
  draft,
  findPhase,
  isUnresolved,
  latestPhase,
  openedEvents,
  phaseIdAt,
  phaseMatches,
} from "../state.ts";
import type { ActionResult, EliminationFormat, Tournament, TournamentEvent } from "../types.ts";

export type TopCutInput = {
  format: EliminationFormat;
  grandFinalType?: GrandFinalType;
  size: number;
};

export function createTopCut(tournament: Tournament, input: TopCutInput): ActionResult {
  if (tournament.status === "complete") {
    throw new TournamentError("tournament_complete");
  }
  const previous = latestPhase(tournament);
  if (previous.format !== "swiss") {
    throw new TournamentError("top_cut_needs_swiss");
  }
  if (previous.status === "pending") {
    throw new TournamentError("swiss_not_started");
  }
  const underway = previous.status === "underway";
  if (underway && previous.currentRound !== previous.rounds) {
    throw new TournamentError("swiss_rounds_left");
  }
  if (underway && phaseMatches(tournament, previous.id).some(isUnresolved)) {
    throw new TournamentError("swiss_unresolved");
  }
  const cut = swissRankings(tournament, previous.id).slice(0, input.size);
  if (cut.length < 2) {
    throw new TournamentError("top_cut_too_small");
  }

  const next = draft(tournament);
  const events: TournamentEvent[] = [];
  if (underway) {
    finalizePhase(next, previous.id);
    findPhase(next, previous.id).status = "complete";
    events.push({ type: "phase_completed", phaseId: previous.id });
  }

  const grandFinalType =
    input.format === "double_elimination" ? (input.grandFinalType ?? "double") : null;
  const phaseId = phaseIdAt(previous.position + 1);
  next.phases.push({
    id: phaseId,
    format: input.format,
    position: previous.position + 1,
    status: "underway",
    rounds: null,
    currentRound: null,
    grandFinalType,
  });
  events.push({ type: "phase_started", phaseId });
  next.phaseParticipants.push(
    ...cut.map((r, i) => ({
      phaseId,
      participantId: r.participantId,
      seed: i + 1,
      finalStanding: null,
    })),
  );
  insertBracket(next, phaseId, input.format, grandFinalType ?? "double");

  events.push(...openedEvents(tournament, next));
  return { tournament: next, events };
}
