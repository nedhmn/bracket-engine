import { Card } from "@repo/design-system/components/card";
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

import { isDropped, nameOf } from "../lookup.ts";

type Row = {
  cells: (string | number)[];
  dropped: boolean;
  id: string;
};

function StandingsTable({ head, rows, title }: { head: string[]; rows: Row[]; title: string }) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <div className="grid min-w-0 content-start gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
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
            <TableRow key={r.id} className={cn(r.dropped && "text-text-faint")}>
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
    </div>
  );
}

export function PhaseStandings({ phase, tournament }: { phase: Phase; tournament: Tournament }) {
  if (phase.format === "swiss") {
    const rows = swissRankings(tournament, phase.id).map((r) => ({
      id: r.participantId,
      cells: [
        r.rank,
        nameOf(tournament, r.participantId),
        `${r.wins}-${r.losses}`,
        r.tb1,
        r.tb2,
        r.tb3,
      ],
      dropped: isDropped(tournament, r.participantId),
    }));
    return (
      <StandingsTable
        title="Standings"
        head={["#", "Player", "W-L", "TB1", "TB2", "TB3"]}
        rows={rows}
      />
    );
  }
  const rows = phaseStandings(tournament, phase.id).map((s) => ({
    id: s.participantId,
    cells: [s.rank, nameOf(tournament, s.participantId)],
    dropped: isDropped(tournament, s.participantId),
  }));
  return <StandingsTable title="Standings" head={["#", "Player"]} rows={rows} />;
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
    <Card className="p-5 [&>div]:max-w-md">
      <StandingsTable title="Final standings" head={["#", "Player"]} rows={rows} />
    </Card>
  );
}
