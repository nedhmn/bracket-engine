import { cn } from "@repo/design-system/lib/utils";
import type { BracketSection, Match, Phase, Tournament } from "tournament-engine";
import { reopenResult, reportResult } from "tournament-engine";

import { groupBy, isLive, nameOf, phaseMatches } from "../lookup.ts";
import { useSession } from "../session.tsx";
import { FailureText } from "./fields.tsx";

const SECTION_LABELS: Record<BracketSection, string> = {
  winners: "Winners bracket",
  losers: "Losers bracket",
  grand_final: "Grand final",
};

type CardProps = {
  live: boolean;
  match: Match;
  seeds: Map<string, number>;
  tournament: Tournament;
};

function Slot({ id, live, match, seeds, tournament }: CardProps & { id: string | null }) {
  const session = useSession();
  const base = "flex w-full min-w-0 items-center justify-between gap-2 border-t px-2.5 py-1.5";
  if (id === null) {
    const label = match.status === "bye" || match.status === "complete" ? "BYE" : "TBD";
    return <div className={cn(base, "font-code text-xs text-text-faint")}>{label}</div>;
  }
  const body = (
    <>
      <span className="truncate">{nameOf(tournament, id)}</span>
      <span className="shrink-0 font-code text-xs text-text-faint">{seeds.get(id) ?? ""}</span>
    </>
  );
  if (live && match.status === "open") {
    return (
      <button
        type="button"
        className={cn(base, "cursor-pointer text-left transition-colors hover:bg-accent-bg")}
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
        outcome === "winner" && "bg-success-bg font-medium",
        outcome === "loser" && "text-text-faint line-through",
      )}
    >
      {body}
    </div>
  );
}

function MatchTag({ live, match }: { live: boolean; match: Match }) {
  const session = useSession();
  if (live && match.status === "complete") {
    return (
      <button
        type="button"
        className="cursor-pointer rounded-sm px-1 text-text-secondary transition-colors hover:bg-bg-hover-strong hover:text-text-primary"
        onClick={() =>
          session.run(`match:${match.id}`, (t) => reopenResult(t, { matchId: match.id }))
        }
      >
        Reopen
      </button>
    );
  }
  if (match.forfeit) {
    return <span>forfeit</span>;
  }
  return match.status === "unreachable" ? <span>not needed</span> : null;
}

function MatchCard(props: CardProps) {
  const { live, match } = props;
  const muted = match.status === "bye" || match.status === "unreachable";

  return (
    <div className="grid gap-1">
      <div
        className={cn(
          "overflow-hidden rounded-md border bg-bg text-sm",
          match.status === "open" &&
            live &&
            "border-border-bright shadow-[inset_2px_0_0_var(--accent)]",
          muted && "opacity-50",
        )}
      >
        <div className="flex min-h-6 items-center justify-between bg-bg-hover px-2.5 font-code text-[11px] text-text-muted">
          <span>M{match.matchNumber}</span>
          <MatchTag live={live} match={match} />
        </div>
        <Slot {...props} id={match.player1Id} />
        <Slot {...props} id={match.player2Id} />
      </div>
      <FailureText scope={`match:${match.id}`} />
    </div>
  );
}

function Rounds({ matches, ...props }: Omit<CardProps, "match"> & { matches: Match[] }) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex w-max gap-3">
        {[...groupBy(matches, (m) => m.roundNumber)].map(([round, list]) => (
          <div key={round} className="flex w-48 shrink-0 flex-col">
            <div className="pb-2 text-center font-code text-[11px] tracking-wider text-text-faint uppercase">
              Round {round}
            </div>
            <div className="flex flex-1 flex-col justify-around gap-2">
              {list.map((m) => (
                <MatchCard key={m.id} match={m} {...props} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Bracket({ phase, tournament }: { phase: Phase; tournament: Tournament }) {
  const live = isLive(tournament, phase);
  const seeds = new Map(
    tournament.phaseParticipants
      .filter((p) => p.phaseId === phase.id)
      .map((p) => [p.participantId, p.seed]),
  );
  const matches = phaseMatches(tournament, phase.id);
  const sections = groupBy(matches, (m) => m.bracketSection);
  const props = { live, seeds, tournament };

  if (phase.format === "single_elimination" || sections.size === 1) {
    return (
      <div className="min-w-0">
        <Rounds matches={matches} {...props} />
      </div>
    );
  }
  return (
    <div className="grid min-w-0 gap-5">
      {[...sections].map(([key, list]) => (
        <div key={key ?? "bracket"} className="grid min-w-0 gap-2">
          <h3 className="text-sm font-medium">{key === null ? "Bracket" : SECTION_LABELS[key]}</h3>
          <Rounds matches={list} {...props} />
        </div>
      ))}
    </div>
  );
}
