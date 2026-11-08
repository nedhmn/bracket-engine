import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/dropdown-menu";
import { cn } from "@repo/design-system/lib/utils";
import type { ReactNode } from "react";
import type { Match, Tournament } from "tournament-engine";
import { canReopenResult, dropParticipant, reopenResult, reportResult } from "tournament-engine";

import { activePhase, isActive, nameOf } from "../lookup.ts";
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

export function matchScope(match: Match): string {
  return `match:${match.id}`;
}

export function PlayerPick({
  children,
  className,
  id,
  match,
  tournament,
}: {
  children?: ReactNode;
  className?: string;
  id: string;
  match: Match;
  tournament: Tournament;
}) {
  const session = useSession();
  const name = nameOf(tournament, id);
  return (
    <button
      type="button"
      title={`Report ${name} as the winner`}
      className={cn(
        "min-w-0 cursor-pointer truncate text-left transition-colors hover:bg-accent-bg hover:text-text-primary focus-visible:bg-accent-bg focus-visible:outline-none",
        className,
      )}
      onClick={() =>
        session.perform(matchScope(match), null, (call) =>
          call("reportResult", { matchId: match.id, winnerId: id }, (i) =>
            reportResult(tournament, i),
          ),
        )
      }
    >
      {children ?? name}
    </button>
  );
}

export function slotTone(match: Match, id: string | null): string {
  if (match.winnerId === null || id === null) {
    return "";
  }
  return match.winnerId === id ? "font-semibold text-text-primary" : "text-text-faint";
}

export function FinishedMatch({
  children,
  className,
  match,
  tournament,
}: {
  children: ReactNode;
  className?: string;
  match: Match;
  tournament: Tournament;
}) {
  const session = useSession();
  const live = tournament.status === "underway" && match.phaseId === activePhase(tournament)?.id;
  const reopenable = live && canReopenResult(tournament, { matchId: match.id });
  const droppable = live
    ? [match.player1Id, match.player2Id].filter(
        (id): id is string => id !== null && isActive(tournament, id),
      )
    : [];

  if (!reopenable && droppable.length === 0) {
    return <div className={className}>{children}</div>;
  }
  const scope = matchScope(match);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title={`M${match.matchNumber} options`}
        className={cn(
          "cursor-pointer text-left transition-colors outline-none hover:bg-bg-hover focus-visible:bg-bg-hover data-[state=open]:bg-bg-hover",
          className,
        )}
      >
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>M{match.matchNumber}</DropdownMenuLabel>
        {reopenable ? (
          <DropdownMenuItem
            onSelect={() =>
              session.perform(scope, null, (call) =>
                call("reopenResult", { matchId: match.id }, (i) => reopenResult(tournament, i)),
              )
            }
          >
            Reopen
          </DropdownMenuItem>
        ) : null}
        {reopenable && droppable.length > 0 ? <DropdownMenuSeparator /> : null}
        {droppable.map((id) => (
          <DropdownMenuItem
            key={id}
            variant="destructive"
            onSelect={() =>
              session.perform(scope, null, (call) =>
                call("dropParticipant", { participantId: id }, (i) =>
                  dropParticipant(tournament, i),
                ),
              )
            }
          >
            Drop {nameOf(tournament, id)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
