import { Badge } from "@repo/design-system/components/badge";
import { Card } from "@repo/design-system/components/card";
import { cn } from "@repo/design-system/lib/utils";
import type { Phase, Tournament } from "tournament-engine";

import { formatLabel } from "../lookup.ts";
import { Bracket } from "./bracket.tsx";
import { PhaseStandings } from "./standings.tsx";
import { StatusBadge } from "./status-badge.tsx";
import { SwissRounds } from "./swiss.tsx";

export function PhaseView({ phase, tournament }: { phase: Phase; tournament: Tournament }) {
  const swiss = phase.format === "swiss";

  return (
    <Card className="grid min-w-0 gap-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg">
          Phase {phase.position} <span className="text-text-muted">·</span>{" "}
          {formatLabel(phase.format)}
        </h2>
        {swiss && phase.currentRound !== null ? (
          <Badge tone="outline" mono>
            round {phase.currentRound} of {phase.rounds ?? "?"}
          </Badge>
        ) : null}
        <StatusBadge status={phase.status} />
      </div>
      <div
        className={cn(
          "grid min-w-0 gap-6",
          swiss && "lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]",
        )}
      >
        {swiss ? (
          <SwissRounds phase={phase} tournament={tournament} />
        ) : (
          <Bracket phase={phase} tournament={tournament} />
        )}
        <div className={cn("min-w-0", !swiss && "max-w-md")}>
          <PhaseStandings phase={phase} tournament={tournament} />
        </div>
      </div>
    </Card>
  );
}
