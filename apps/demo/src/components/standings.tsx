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
  cells: (string | number)[];
  dropped: boolean;
  id: string;
};

function StandingsTable({
  cutAfter,
  head,
  rows,
}: {
  cutAfter?: string;
  head: string[];
  rows: Row[];
}) {
  return (
    <Table className="tabular-nums">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {head.map((h) => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id} className={cn(r.id === cutAfter && "border-b-2 border-b-accent")}>
            {r.cells.map((c, i) => (
              <TableCell
                key={head[i]}
                className={cn(
                  i === 1 ? "w-full" : "font-code text-xs",
                  r.dropped && "text-text-faint",
                  r.dropped && i === 1 && "line-through",
                )}
              >
                {c}
              </TableCell>
            ))}
          </TableRow>
        ))}
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
    cells: [
      r.rank,
      nameOf(tournament, r.participantId),
      `${r.wins}-${r.losses}`,
      decimal(r.tb1),
      decimal(r.tb2),
      decimal(r.tb3),
    ],
    dropped: !isActive(tournament, r.participantId),
  }));
  const qualifiers = rows.filter((r) => !r.dropped);
  const last = cut === null || qualifiers.length <= cut ? undefined : qualifiers[cut - 1].id;
  return (
    <div className="grid gap-2">
      <StandingsTable
        cutAfter={last}
        head={["#", "Player", "W-L", "TB1", "TB2", "TB3"]}
        rows={rows}
      />
      {last === undefined ? null : (
        <p className="text-xs text-text-muted">The top {cut} above the line make the cut.</p>
      )}
    </div>
  );
}

export function PhaseStandings({ phase, tournament }: { phase: Phase; tournament: Tournament }) {
  const rows = phaseStandings(tournament, phase.id).map((r) => ({
    id: r.participantId,
    cells: [r.rank, nameOf(tournament, r.participantId)],
    dropped: !isActive(tournament, r.participantId),
  }));
  return <StandingsTable head={["#", "Player"]} rows={rows} />;
}

export function FinalStandings({ tournament }: { tournament: Tournament }) {
  const rows = tournament.participants
    .flatMap((p) => (p.finalStanding === null ? [] : [{ p, rank: p.finalStanding }]))
    .toSorted((a, b) => a.rank - b.rank || a.p.name.localeCompare(b.p.name))
    .map(({ p, rank }) => ({ id: p.id, cells: [rank, p.name], dropped: p.status === "dropped" }));
  return <StandingsTable head={["#", "Player"]} rows={rows} />;
}
