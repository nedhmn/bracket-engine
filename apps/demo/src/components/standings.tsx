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
import { swissRankings } from "tournament-engine";

import { isActive, nameOf } from "../lookup.ts";

type Row = {
  cells: (string | number)[];
  dropped: boolean;
  id: string;
};

function StandingsTable({ head, rows }: { head: string[]; rows: Row[] }) {
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
          <TableRow key={r.id}>
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

export function SwissStandings({ phase, tournament }: { phase: Phase; tournament: Tournament }) {
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
  return <StandingsTable head={["#", "Player", "W-L", "TB1", "TB2", "TB3"]} rows={rows} />;
}

export function FinalStandings({ tournament }: { tournament: Tournament }) {
  const rows = tournament.participants
    .flatMap((p) => (p.finalStanding === null ? [] : [{ p, rank: p.finalStanding }]))
    .toSorted((a, b) => a.rank - b.rank || a.p.name.localeCompare(b.p.name))
    .map(({ p, rank }) => ({ id: p.id, cells: [rank, p.name], dropped: p.status === "dropped" }));
  if (rows.length === 0) {
    return null;
  }
  return (
    <section className="grid max-w-md gap-2 border-t pt-6">
      <h2 className="text-sm font-medium">Final standings</h2>
      <StandingsTable head={["#", "Player"]} rows={rows} />
    </section>
  );
}
