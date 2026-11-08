import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/table";
import { cn } from "@repo/design-system/lib/utils";
import type { Phase, Tournament } from "tournament-engine";
import { phaseStandings, swissRankings } from "tournament-engine";

import { isActive, nameOf } from "../lookup.ts";

type Row = {
  id: string;
  rank: number;
  stats: string[];
};

const FIT = "w-px px-1.5 text-right font-code text-xs";

function StandingsTable({
  cutAfter,
  rows,
  stats,
  tournament,
}: {
  cutAfter?: string;
  rows: Row[];
  stats: string[];
  tournament: Tournament;
}) {
  return (
    <Table className="table-auto tabular-nums">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-px pr-1.5">#</TableHead>
          <TableHead className="px-1.5">Player</TableHead>
          {stats.map((s) => (
            <TableHead key={s} className={cn(FIT, "font-ui")}>
              {s}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const dropped = !isActive(tournament, r.id);
          return (
            <TableRow key={r.id} className={cn(r.id === cutAfter && "border-b-2 border-b-accent")}>
              <TableCell className="w-px pr-1.5 font-code text-xs text-text-muted">
                {r.rank}
              </TableCell>
              <TableCell
                className={cn("max-w-0 truncate px-1.5", dropped && "text-text-faint line-through")}
              >
                {nameOf(tournament, r.id)}
              </TableCell>
              {r.stats.map((s, i) => (
                <TableCell key={stats[i]} className={cn(FIT, dropped && "text-text-faint")}>
                  {s}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function decimal(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

export function SwissStandings({
  cut,
  phase,
  tournament,
}: {
  cut: number | null;
  phase: Phase;
  tournament: Tournament;
}) {
  const rows = swissRankings(tournament, phase.id).map((r) => ({
    id: r.participantId,
    rank: r.rank,
    stats: [`${r.wins}-${r.losses}`, decimal(r.tb1), decimal(r.tb2), decimal(r.tb3)],
  }));
  const qualifiers = rows.filter((r) => isActive(tournament, r.id));
  const last = cut === null || qualifiers.length <= cut ? undefined : qualifiers[cut - 1].id;
  return (
    <div className="grid gap-2">
      <StandingsTable
        cutAfter={last}
        rows={rows}
        stats={["W-L", "TB1", "TB2", "TB3"]}
        tournament={tournament}
      />
      {last === undefined ? null : (
        <p className="text-xs text-text-muted">The top {cut} above the line make the cut.</p>
      )}
    </div>
  );
}

export function OverallStandings({
  cut,
  swiss,
  tournament,
}: {
  cut: Phase;
  swiss: Phase;
  tournament: Tournament;
}) {
  const rankings = swissRankings(tournament, swiss.id);
  const records = new Map(rankings.map((r) => [r.participantId, `${r.wins}-${r.losses}`]));
  const top = phaseStandings(tournament, cut.id);
  const inCut = new Set(top.map((r) => r.participantId));
  const rest = rankings.filter((r) => !inCut.has(r.participantId));
  const rows = [
    ...top.map((r) => ({ id: r.participantId, rank: r.rank })),
    ...rest.map((r) => ({
      id: r.participantId,
      rank: top.length + 1 + rest.findIndex((o) => o.rank === r.rank),
    })),
  ].map((r) => ({ ...r, stats: [records.get(r.id) ?? ""] }));
  return (
    <StandingsTable
      cutAfter={top.at(-1)?.participantId}
      rows={rows}
      stats={["Swiss W-L"]}
      tournament={tournament}
    />
  );
}

export function PhaseStandings({ phase, tournament }: { phase: Phase; tournament: Tournament }) {
  const rows = phaseStandings(tournament, phase.id).map((r) => ({
    id: r.participantId,
    rank: r.rank,
    stats: [],
  }));
  return <StandingsTable rows={rows} stats={[]} tournament={tournament} />;
}
