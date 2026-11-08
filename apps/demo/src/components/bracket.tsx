import type { BracketSection, Match, Phase, Tournament } from "tournament-engine";

import { groupBy, phaseMatches, phaseSeeds, roundName } from "../lookup.ts";
import { MatchCard } from "./match.tsx";

const SECTION_LABELS: Record<BracketSection, string> = {
  winners: "Winners bracket",
  losers: "Losers bracket",
  grand_final: "Grand final",
};

type RoundsProps = {
  matches: Match[];
  phase: Phase;
  seeds: Map<string, number>;
  tournament: Tournament;
};

function columnName(phase: Phase, section: BracketSection | null, round: number, rounds: number) {
  if (section === "grand_final") {
    return round === 1 ? "Final" : "Reset";
  }
  if (phase.format === "single_elimination") {
    return roundName(phase.format, section, round, rounds);
  }
  return round === rounds ? "Final" : `Round ${round}`;
}

function Rounds({ matches, phase, seeds, tournament }: RoundsProps) {
  const columns = groupBy(matches, (m) => m.roundNumber);
  const rounds = Math.max(...columns.keys());
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex w-max gap-6">
        {[...columns].map(([round, list]) => (
          <div key={round} className="flex w-56 shrink-0 flex-col">
            <div className="pb-2 font-code text-[11px] tracking-wider text-text-muted uppercase">
              {columnName(phase, list.at(0)?.bracketSection ?? null, round, rounds)}
            </div>
            <div className="flex flex-1 flex-col justify-around gap-4">
              {list.map((m) => (
                <MatchCard key={m.id} match={m} seeds={seeds} tournament={tournament} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BracketView({ phase, tournament }: { phase: Phase; tournament: Tournament }) {
  const seeds = phaseSeeds(tournament, phase.id);
  const matches = phaseMatches(tournament, phase.id);
  const sections = groupBy(matches, (m) => m.bracketSection);

  if (phase.format === "single_elimination" || sections.size === 1) {
    return <Rounds matches={matches} phase={phase} seeds={seeds} tournament={tournament} />;
  }
  return (
    <div className="grid min-w-0 gap-8">
      {[...sections].map(([key, list]) => (
        <section key={key ?? "bracket"} className="grid min-w-0 gap-3">
          <h3 className="text-sm font-medium text-text-secondary">
            {key === null ? "Bracket" : SECTION_LABELS[key]}
          </h3>
          <Rounds matches={list} phase={phase} seeds={seeds} tournament={tournament} />
        </section>
      ))}
    </div>
  );
}
