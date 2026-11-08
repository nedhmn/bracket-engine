import { cn } from "@repo/design-system/lib/utils";
import type { Match, Tournament } from "tournament-engine";
import { canReopenResult, reopenResult, reportResult } from "tournament-engine";

import { activePhase, nameOf } from "../lookup.ts";
import { useSession } from "../session.tsx";

export function FailureText({ className, scope }: { className?: string; scope: string }) {
  const { failure } = useSession();
  if (failure?.scope !== scope) {
    return null;
  }
  return (
    <p role="alert" className={cn("text-xs text-error", className)}>
      {failure.message}
    </p>
  );
}

type CardProps = {
  match: Match;
  tournament: Tournament;
};

const ROW = "flex h-9 w-full min-w-0 items-center gap-2 px-3 text-left text-sm";

function Row({ id, match, tournament }: CardProps & { id: string | null }) {
  const session = useSession();
  if (id === null) {
    const label = match.status === "bye" || match.status === "complete" ? "BYE" : "TBD";
    return <div className={cn(ROW, "font-code text-xs text-text-faint")}>{label}</div>;
  }
  const name = nameOf(tournament, id);
  const body = <span className="min-w-0 flex-1 truncate">{name}</span>;
  if (match.status === "open") {
    return (
      <button
        type="button"
        title={`Make ${name} the winner`}
        className={cn(
          ROW,
          "cursor-pointer transition-colors outline-none hover:bg-accent-bg focus-visible:bg-accent-bg",
        )}
        onClick={() =>
          session.perform(matchScope(match), null, (call) =>
            call("reportResult", { matchId: match.id, winnerId: id }, (i) =>
              reportResult(tournament, i),
            ),
          )
        }
      >
        {body}
      </button>
    );
  }
  const decided = match.status === "complete" && match.winnerId !== null;
  const won = decided && match.winnerId === id;
  const lost = decided && !won;
  return (
    <div className={cn(ROW, won && "bg-accent-bg font-semibold", lost && "opacity-40")}>{body}</div>
  );
}

function matchScope(match: Match): string {
  return `match:${match.id}`;
}

function tagOf(match: Match): string {
  if (match.status === "unreachable") {
    return "not needed";
  }
  return match.forfeit ? "forfeit" : "";
}

export function MatchCard(props: CardProps) {
  const { match, tournament } = props;
  const session = useSession();
  const live = tournament.status === "underway" && match.phaseId === activePhase(tournament)?.id;
  const reopenable =
    live && match.status === "complete" && canReopenResult(tournament, { matchId: match.id });
  const idle = match.status === "bye" || match.status === "unreachable";

  return (
    <div className="grid min-w-0 content-start gap-1">
      <div
        className={cn(
          "border bg-bg-elevated",
          match.status === "open" && "border-accent",
          idle && "text-text-faint",
        )}
      >
        <div className="flex h-7 items-center gap-2 border-b px-3 font-code text-[11px] text-text-faint">
          <span>#{match.matchNumber}</span>
          <span>{tagOf(match)}</span>
          {reopenable ? (
            <button
              type="button"
              className="ml-auto cursor-pointer font-ui text-xs text-accent hover:underline"
              onClick={() =>
                session.perform(matchScope(match), null, (call) =>
                  call("reopenResult", { matchId: match.id }, (i) => reopenResult(tournament, i)),
                )
              }
            >
              Reopen
            </button>
          ) : null}
        </div>
        <div className="divide-y">
          <Row {...props} id={match.player1Id} />
          <Row {...props} id={match.player2Id} />
        </div>
      </div>
      <FailureText scope={matchScope(match)} />
    </div>
  );
}
