import type { Phase, Tournament } from "tournament-engine";

import { groupBy, phaseMatches } from "../lookup.ts";
import { MatchCard } from "./match.tsx";

export function SwissRounds({ phase, tournament }: { phase: Phase; tournament: Tournament }) {
  const rounds = [...groupBy(phaseMatches(tournament, phase.id), (m) => m.roundNumber)].toSorted(
    ([a], [b]) => b - a,
  );

  return (
    <div className="grid gap-8">
      {rounds.map(([round, matches]) => (
        <section key={round} className="grid gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium">Round {round}</h3>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,14rem)] sm:gap-4">
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} tournament={tournament} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
