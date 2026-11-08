import { Button } from "@repo/design-system/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/design-system/components/tooltip";
import { cn } from "@repo/design-system/lib/utils";
import { useState } from "react";
import type { Match, Tournament, TournamentErrorCode } from "tournament-engine";
import { canReopenResult, reopenResult, reportResult, TournamentError } from "tournament-engine";

import { nameOf } from "../lookup.ts";
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
const HEADER = "flex h-7 items-center gap-2 border-b px-3 font-code text-[11px] text-text-faint";

const LOCKED: Partial<Record<TournamentErrorCode, string>> = {
  dropped_participant: "Locked: a player in this match dropped.",
  phase_complete: "Locked: this phase is complete.",
};

function lockReason(tournament: Tournament, match: Match): string | null {
  if (canReopenResult(tournament, { matchId: match.id })) {
    return null;
  }
  try {
    reopenResult(tournament, { matchId: match.id });
  } catch (error) {
    const reason = error instanceof TournamentError ? LOCKED[error.code] : undefined;
    if (reason !== undefined) {
      return reason;
    }
  }
  return "Locked: later results depend on this match.";
}

function Row({ id, match, tournament }: CardProps & { id: string | null }) {
  const session = useSession();
  if (id === null) {
    const label = match.status === "bye" || match.status === "complete" ? "BYE" : "TBD";
    return <div className={cn(ROW, "font-code text-xs text-text-faint")}>{label}</div>;
  }
  const name = nameOf(tournament, id);
  const body = <span className="min-w-0 flex-1 truncate">{name}</span>;
  if (playable(match, tournament)) {
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

function playable(match: Match, tournament: Tournament): boolean {
  return match.status === "open" && tournament.status === "underway";
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

function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.17 6.81a2.83 2.83 0 0 0-4-4L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5Z" />
    </svg>
  );
}

const EDIT_BUTTON = "ml-auto h-5 gap-1 p-0 px-1.5 font-ui text-xs text-text-secondary";

function EditButton({ match, tournament }: CardProps) {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const locked = lockReason(tournament, match);
  const players = [match.player1Id, match.player2Id].filter((id) => id !== null);

  if (locked !== null) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="ml-auto outline-none">
            <Button variant="ghost" disabled className={cn(EDIT_BUTTON, "ml-0")}>
              <PencilIcon />
              Edit
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{locked}</TooltipContent>
      </Tooltip>
    );
  }

  const pick = (winnerId: string) => {
    setOpen(false);
    if (winnerId === match.winnerId) {
      return;
    }
    session.perform(matchScope(match), `Edit #${match.matchNumber}`, (call) => {
      const reopened = call("reopenResult", { matchId: match.id }, (i) =>
        reopenResult(tournament, i),
      );
      call("reportResult", { matchId: match.id, winnerId }, (i) => reportResult(reopened, i));
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" className={EDIT_BUTTON} onClick={() => setOpen(true)}>
        <PencilIcon />
        Edit
      </Button>
      <DialogContent className="max-w-sm gap-5">
        <DialogHeader>
          <DialogTitle>Edit #{match.matchNumber}</DialogTitle>
          <DialogDescription>Pick the winner</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {players.map((id) => {
            const current = id === match.winnerId;
            return (
              <Button
                key={id}
                size="md"
                variant={current ? "secondary" : "outline"}
                className="justify-between"
                onClick={() => pick(id)}
              >
                {nameOf(tournament, id)}
                {current ? <span className="text-xs text-text-muted">Current winner</span> : null}
              </Button>
            );
          })}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="md">
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MatchCard(props: CardProps) {
  const { match } = props;
  const idle = match.status === "bye" || match.status === "unreachable";

  return (
    <div className="grid min-w-0 content-start gap-1">
      <div
        className={cn(
          "border bg-bg-elevated",
          playable(match, props.tournament) && "border-accent",
          idle && "text-text-faint",
        )}
      >
        <div className={HEADER}>
          <span>#{match.matchNumber}</span>
          <span>{tagOf(match)}</span>
          {match.status === "complete" && match.player1Id !== null && match.player2Id !== null ? (
            <EditButton {...props} />
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

export function PlaceholderCard({ bye }: { bye: boolean }) {
  return (
    <div className="border bg-bg-elevated font-code text-xs text-text-faint opacity-60">
      <div className={HEADER}>#?</div>
      <div className="divide-y">
        <div className={ROW}>TBD</div>
        <div className={ROW}>{bye ? "BYE" : "TBD"}</div>
      </div>
    </div>
  );
}
