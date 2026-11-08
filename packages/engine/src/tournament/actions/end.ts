import { TournamentError } from "../errors.ts";
import { finalizePhase, finalizeTournament } from "../standings.ts";
import { draft, isUnresolved } from "../state.ts";
import type { ActionResult, Tournament, TournamentEvent } from "../types.ts";

export type EndTournamentInput = {
  force: boolean;
};

export function endTournament(tournament: Tournament, input: EndTournamentInput): ActionResult {
  if (tournament.status !== "underway") {
    throw new TournamentError("not_underway");
  }
  const active = new Set(tournament.phases.filter((p) => p.status === "underway").map((p) => p.id));
  if (active.size === 0) {
    throw new TournamentError("no_active_phase");
  }
  const unresolved = tournament.matches.filter(
    (m) => active.has(m.phaseId) && isUnresolved(m),
  ).length;
  if (unresolved > 0 && !input.force) {
    throw new TournamentError(
      "unresolved_matches",
      `${unresolved} matches are unresolved. Resolve them or pass force: true.`,
    );
  }

  const next = draft(tournament);
  const events: TournamentEvent[] = [];
  for (const phase of next.phases.toSorted((a, b) => a.position - b.position)) {
    if (active.has(phase.id)) {
      finalizePhase(next, phase.id);
      phase.status = "complete";
      events.push({ type: "phase_completed", phaseId: phase.id });
    }
  }
  finalizeTournament(next);
  next.status = "complete";
  events.push({ type: "tournament_completed", tournamentId: next.id });
  return { tournament: next, events };
}
