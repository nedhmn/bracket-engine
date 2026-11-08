import { Badge } from "@repo/design-system/components/badge";
import { Button } from "@repo/design-system/components/button";
import { cn } from "@repo/design-system/lib/utils";
import type { Match, Phase, Tournament } from "tournament-engine";
import { reopenResult, reportResult, swissRankings } from "tournament-engine";

import { groupBy, isLive, nameOf, phaseMatches } from "../lookup.ts";
import { useSession } from "../session.tsx";
import { FailureText } from "./fields.tsx";

type PairingProps = {
  live: boolean;
  match: Match;
  records: Map<string, string>;
  tournament: Tournament;
};

function Player({ id, live, match, records, tournament }: PairingProps & { id: string }) {
  const session = useSession();
  const body = (
    <>
      <span className="truncate">{nameOf(tournament, id)}</span>
      <span className="shrink-0 font-code text-xs text-text-muted">{records.get(id) ?? ""}</span>
    </>
  );
  const base = "flex min-w-0 items-center justify-between gap-2 rounded-md border px-2.5 py-1.5";
  if (live && match.status === "open") {
    return (
      <button
        type="button"
        className={cn(
          base,
          "cursor-pointer border-border-bright bg-bg text-left transition-colors hover:border-accent hover:bg-accent-bg",
        )}
        title={`Report ${nameOf(tournament, id)} as the winner`}
        onClick={() =>
          session.run(`match:${match.id}`, (t) =>
            reportResult(t, { matchId: match.id, winnerId: id }),
          )
        }
      >
        {body}
      </button>
    );
  }
  const outcome = match.winnerId === null ? "" : match.winnerId === id ? "winner" : "loser";
  return (
    <div
      className={cn(
        base,
        "border-transparent",
        outcome === "winner" && "bg-success-bg font-medium",
        outcome === "loser" && "text-text-faint line-through",
      )}
    >
      {body}
    </div>
  );
}

function Pairing(props: PairingProps) {
  const session = useSession();
  const { live, match } = props;

  return (
    <li className="grid gap-1 px-3 py-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_4.25rem] items-center gap-2 text-sm">
        {match.player1Id === null ? <span /> : <Player {...props} id={match.player1Id} />}
        <span className="text-xs text-text-faint">vs</span>
        {match.player2Id === null ? (
          <span className="px-2.5 font-code text-xs text-text-faint">BYE</span>
        ) : (
          <Player {...props} id={match.player2Id} />
        )}
        <span className="flex justify-end">
          {live && match.status === "complete" ? (
            <Button
              variant="ghost"
              className="rounded-pill text-xs text-text-secondary"
              onClick={() =>
                session.run(`match:${match.id}`, (t) => reopenResult(t, { matchId: match.id }))
              }
            >
              Reopen
            </Button>
          ) : null}
        </span>
      </div>
      {match.forfeit ? (
        <Badge tone="outline" className="w-fit">
          forfeit
        </Badge>
      ) : null}
      <FailureText scope={`match:${match.id}`} />
    </li>
  );
}

export function SwissRounds({ phase, tournament }: { phase: Phase; tournament: Tournament }) {
  const live = isLive(tournament, phase);
  const records = new Map(
    swissRankings(tournament, phase.id).map((r) => [r.participantId, `${r.wins}-${r.losses}`]),
  );
  const rounds = groupBy(phaseMatches(tournament, phase.id), (m) => m.roundNumber);

  return (
    <div className="grid min-w-0 content-start gap-5">
      {[...rounds]
        .toSorted(([a], [b]) => b - a)
        .map(([round, matches]) => (
          <div key={round} className="grid gap-2">
            <h3 className="text-sm font-medium">Round {round}</h3>
            <ul className="divide-y divide-border rounded-md border bg-bg">
              {matches.map((m) => (
                <Pairing
                  key={m.id}
                  live={live}
                  match={m}
                  records={records}
                  tournament={tournament}
                />
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}
