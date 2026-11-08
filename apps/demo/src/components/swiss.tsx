import type { Phase, Tournament } from "tournament-engine";

import { groupBy, phaseMatches } from "../lookup.ts";
import { MatchCard, PlaceholderCard } from "./match.tsx";

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,14rem)] sm:gap-4";

function Placeholders({ players }: { players: number }) {
  const slots = Math.ceil(players / 2);
  return Array.from({ length: slots }, (_, i) => (
    <PlaceholderCard key={i} bye={players % 2 === 1 && i === slots - 1} />
  ));
}

export function SwissRounds({ phase, tournament }: { phase: Phase; tournament: Tournament }) {
  const paired = groupBy(phaseMatches(tournament, phase.id), (m) => m.roundNumber);
  const last = Math.max(0, ...paired.keys());
  const planned = phase.status === "underway" ? Math.max(phase.rounds ?? last, last) : last;
  const players = tournament.participants.filter((p) => p.status === "active").length;

  return (
    <div className="grid gap-8">
      {Array.from({ length: planned }, (_, i) => i + 1).map((round) => {
        const matches = paired.get(round);
        return (
          <section key={round} className="grid gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-medium">Round {round}</h3>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className={GRID}>
              {matches === undefined ? (
                <Placeholders players={players} />
              ) : (
                matches.map((m) => <MatchCard key={m.id} match={m} tournament={tournament} />)
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
