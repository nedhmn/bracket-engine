import type { Tournament, TournamentEvent } from "tournament-engine";

import { esc, nameOf } from "./html.ts";

function describe(tournament: Tournament, event: TournamentEvent): string {
  switch (event.type) {
    case "tournament_created":
      return "Tournament created";
    case "tournament_started":
      return "Tournament started";
    case "tournament_completed":
      return "Tournament complete";
    case "participant_joined":
      return `${nameOf(tournament, event.participantId)} joined`;
    case "participant_removed":
      return `${event.participantId} removed`;
    case "participant_dropped":
      return `${nameOf(tournament, event.participantId)} dropped`;
    case "phase_started":
      return `${event.phaseId} started`;
    case "phase_completed":
      return `${event.phaseId} complete`;
    case "swiss_round_paired":
      return `Round ${event.roundNumber} paired`;
    case "match_opened":
      return `${event.matchId} open`;
    case "match_reported":
      return `${event.matchId}: ${nameOf(tournament, event.winnerId)} wins${event.forfeit ? " by forfeit" : ""}`;
    case "match_reopened":
      return `${event.matchId} reopened`;
  }
}

export function renderEvents(tournament: Tournament | null, events: TournamentEvent[]): string {
  if (tournament === null || events.length === 0) {
    return "";
  }
  const items = events
    .map((e) => `<li><code>${esc(e.type)}</code> ${esc(describe(tournament, e))}</li>`)
    .join("");
  return `
    <details class="events">
      <summary>Last action: ${events.length} event${events.length === 1 ? "" : "s"}</summary>
      <ul>${items}</ul>
    </details>`;
}
