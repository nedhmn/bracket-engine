import { cn } from "@repo/design-system/lib/utils";
import { useState } from "react";
import type { Match, Phase, Tournament } from "tournament-engine";

import { nameOf, phaseMatches } from "../lookup.ts";
import { FailureText, FinishedMatch, matchScope, PlayerPick, slotTone } from "./match.tsx";
import { Segmented } from "./segmented.tsx";
import { SwissStandings } from "./standings.tsx";

const ROW = "grid grid-cols-[2.75rem_minmax(0,1fr)_1.5rem_minmax(0,1fr)] items-center gap-2 px-3";

function Pairing({ match, tournament }: { match: Match; tournament: Tournament }) {
  const number = <span className="font-code text-xs text-text-faint">M{match.matchNumber}</span>;
  const vs = <span className="text-center text-xs text-text-faint">vs</span>;
  const { player1Id: p1, player2Id: p2 } = match;

  if (match.status === "open" && p1 !== null && p2 !== null) {
    const pick = "rounded-md bg-bg-hover px-2.5 py-1.5";
    return (
      <div className={cn(ROW, "py-2")}>
        {number}
        <PlayerPick className={pick} id={p1} match={match} tournament={tournament} />
        {vs}
        <PlayerPick className={pick} id={p2} match={match} tournament={tournament} />
      </div>
    );
  }
  if (match.status === "bye") {
    return (
      <div className={cn(ROW, "py-3.5 text-text-secondary")}>
        {number}
        <span className="truncate">{nameOf(tournament, p1 ?? p2)}</span>
        <span />
        <span className="font-code text-xs text-text-faint">BYE</span>
      </div>
    );
  }
  return (
    <FinishedMatch className={cn(ROW, "w-full py-3.5")} match={match} tournament={tournament}>
      {number}
      <span className={cn("truncate", slotTone(match, p1))}>{nameOf(tournament, p1)}</span>
      {vs}
      <span className={cn("truncate", slotTone(match, p2))}>
        {nameOf(tournament, p2)}
        {match.forfeit ? <span className="ml-2 font-code text-xs">forfeit</span> : null}
      </span>
    </FinishedMatch>
  );
}

export function SwissView({ phase, tournament }: { phase: Phase; tournament: Tournament }) {
  const current = phase.currentRound ?? 1;
  const [picked, setPicked] = useState<{ current: number; round: number } | null>(null);
  const round = picked?.current === current ? picked.round : current;
  const rounds = Array.from({ length: phase.rounds ?? current }, (_, i) => i + 1);
  const matches = phaseMatches(tournament, phase.id).filter((m) => m.roundNumber === round);

  return (
    <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <section className="grid min-w-0 content-start gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Round {round} pairings</h2>
          <Segmented
            label="Round"
            value={round}
            onChange={(r) => setPicked({ current, round: r })}
            options={rounds.map((r) => ({ value: r, label: `R${r}`, disabled: r > current }))}
          />
        </div>
        <ul className="divide-y border-y">
          {matches.map((m) => (
            <li key={m.id}>
              <Pairing match={m} tournament={tournament} />
              <FailureText className="px-3 pb-2" scope={matchScope(m)} />
            </li>
          ))}
        </ul>
      </section>
      <section className="grid min-w-0 content-start gap-3">
        <h2 className="flex min-h-9 items-center text-sm font-medium">Standings</h2>
        <SwissStandings phase={phase} tournament={tournament} />
      </section>
    </div>
  );
}
