import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/design-system/components/tooltip";
import { cn } from "@repo/design-system/lib/utils";
import { useState } from "react";
import type { Phase, Tournament } from "tournament-engine";
import { swissRankings } from "tournament-engine";

import { isActive, nameOf, sortedPhases } from "../lookup.ts";
import { type Plan, presetInfo } from "../plan.ts";
import {
  bracketPlacements,
  overallPlacements,
  type Placement,
  records,
  seedsOf,
} from "../standings.ts";
import { Segmented } from "./segmented.tsx";

type Stat = {
  label: string;
  tip?: string;
};

type Row = Placement & {
  stats: string[];
};

type View = "overall" | "swiss" | "cut";

const VIEWS = [
  { label: "Overall", value: "overall" },
  { label: "Swiss", value: "swiss" },
  { label: "Top cut", value: "cut" },
] as const;

const RECORD: Stat = { label: "Record" };
const SEED: Stat = { label: "Seed" };
const TIEBREAKS: Stat[] = [
  {
    label: "Opp",
    tip: "Opponents' record: each opponent's wins minus losses, summed (at least -3 per opponent).",
  },
  { label: "OOpp", tip: "Opponents' opponents: each opponent's Opp, summed." },
  {
    label: "Late",
    tip: "Loss timing: each loss round squared, summed. Later losses score higher.",
  },
];

const FIT = "w-px px-1.5 text-right font-code text-xs";
const NO_RANK = "–";

function StatHead({ stat }: { stat: Stat }) {
  if (stat.tip === undefined) {
    return <TableHead className={cn(FIT, "font-ui")}>{stat.label}</TableHead>;
  }
  return (
    <TableHead className={cn(FIT, "font-ui")}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className="cursor-help underline decoration-dotted underline-offset-4 outline-none"
          >
            {stat.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-56">
          {stat.tip}
        </TooltipContent>
      </Tooltip>
    </TableHead>
  );
}

function StandingsTable({
  cutAfter,
  rows,
  stats,
  tournament,
}: {
  cutAfter?: string;
  rows: Row[];
  stats: Stat[];
  tournament: Tournament;
}) {
  return (
    <Table className="table-auto tabular-nums">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-px pr-1.5">Rank</TableHead>
          <TableHead className="px-1.5">Player</TableHead>
          {stats.map((s) => (
            <StatHead key={s.label} stat={s} />
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const dropped = !isActive(tournament, r.id);
          return (
            <TableRow key={r.id} className={cn(r.id === cutAfter && "border-b-2 border-b-accent")}>
              <TableCell className="w-px pr-1.5 font-code text-xs text-text-muted">
                {r.rank ?? NO_RANK}
              </TableCell>
              <TableCell
                className={cn("max-w-0 truncate px-1.5", dropped && "text-text-faint line-through")}
              >
                {nameOf(tournament, r.id)}
              </TableCell>
              {r.stats.map((s, i) => (
                <TableCell key={stats[i].label} className={cn(FIT, dropped && "text-text-faint")}>
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

function SwissTable({
  cut,
  made,
  phase,
  tournament,
}: {
  cut: number | null;
  made?: Set<string>;
  phase: Phase;
  tournament: Tournament;
}) {
  const rows = swissRankings(tournament, phase.id).map((r) => ({
    id: r.participantId,
    rank: r.rank,
    stats: [`${r.wins}-${r.losses}`, decimal(r.tb1), decimal(r.tb2), decimal(r.tb3)],
  }));
  const qualifiers = rows.filter((r) => isActive(tournament, r.id));
  const last =
    made === undefined
      ? cut === null || qualifiers.length <= cut
        ? undefined
        : qualifiers[cut - 1].id
      : rows.findLast((r) => made.has(r.id))?.id;
  return (
    <div className="grid gap-2">
      <StandingsTable
        cutAfter={last}
        rows={rows}
        stats={[RECORD, ...TIEBREAKS]}
        tournament={tournament}
      />
      {last === undefined || made !== undefined ? null : (
        <p className="text-xs text-text-muted">The top {cut} above the line make the cut.</p>
      )}
    </div>
  );
}

function BracketTable({
  phase,
  seeded,
  tournament,
}: {
  phase: Phase;
  seeded: boolean;
  tournament: Tournament;
}) {
  const record = records(tournament, phase.id);
  const seeds = seedsOf(tournament, phase.id);
  const rows = bracketPlacements(tournament, phase).map((p) => ({
    ...p,
    stats: seeded
      ? [String(seeds.get(p.id) ?? ""), record.get(p.id) ?? ""]
      : [record.get(p.id) ?? ""],
  }));
  return (
    <StandingsTable
      rows={rows}
      stats={seeded ? [SEED, RECORD] : [RECORD]}
      tournament={tournament}
    />
  );
}

function OverallTable({
  cut,
  swiss,
  tournament,
}: {
  cut: Phase;
  swiss: Phase;
  tournament: Tournament;
}) {
  const record = records(tournament);
  const placements = overallPlacements(tournament, swiss, cut);
  const size = tournament.phaseParticipants.filter((r) => r.phaseId === cut.id).length;
  const rows = placements.map((p) => ({ ...p, stats: [record.get(p.id) ?? ""] }));
  return (
    <StandingsTable
      cutAfter={placements[size - 1]?.id}
      rows={rows}
      stats={[RECORD]}
      tournament={tournament}
    />
  );
}

function Body({ plan, tournament }: { plan: Plan | null; tournament: Tournament }) {
  const [view, setView] = useState<View>("overall");
  const [first] = sortedPhases(tournament);
  const cut = tournament.phases.find((p) => p.position > 1);

  if (cut !== undefined) {
    return (
      <>
        <Segmented label="Standings view" options={VIEWS} value={view} onChange={setView} />
        {view === "overall" ? (
          <OverallTable cut={cut} swiss={first} tournament={tournament} />
        ) : view === "swiss" ? (
          <SwissTable
            cut={null}
            made={new Set(seedsOf(tournament, cut.id).keys())}
            phase={first}
            tournament={tournament}
          />
        ) : (
          <BracketTable phase={cut} seeded tournament={tournament} />
        )}
      </>
    );
  }
  if (first.format !== "swiss") {
    return <BracketTable phase={first} seeded={false} tournament={tournament} />;
  }
  const pending = plan !== null && presetInfo(plan.preset).cut !== null;
  return (
    <SwissTable
      cut={pending && tournament.status !== "complete" ? plan.topCut : null}
      phase={first}
      tournament={tournament}
    />
  );
}

export function Standings({ plan, tournament }: { plan: Plan | null; tournament: Tournament }) {
  return (
    <>
      <h2 className="text-base font-medium">
        {tournament.status === "complete" ? "Final standings" : "Standings"}
      </h2>
      <Body plan={plan} tournament={tournament} />
    </>
  );
}
