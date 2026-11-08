import { Code } from "@repo/design-system/components/code";
import type { Tournament, TournamentEvent } from "tournament-engine";

import { nameOf } from "../lookup.ts";

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

export function EventLog({
  events,
  tournament,
}: {
  events: TournamentEvent[];
  tournament: Tournament | null;
}) {
  if (tournament === null || events.length === 0) {
    return null;
  }
  return (
    <details className="group rounded-lg border">
      <summary className="cursor-pointer px-5 py-3 text-sm text-text-secondary transition-colors hover:text-text-primary">
        Last action: {events.length} event{events.length === 1 ? "" : "s"}
      </summary>
      <ul className="grid gap-1.5 border-t px-5 py-3 text-sm">
        {events.map((e, i) => (
          // Events carry no id and one action can emit the same type twice
          <li key={i} className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <Code className="text-xs">{e.type}</Code>
            <span className="min-w-0 break-words text-text-secondary">
              {describe(tournament, e)}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
