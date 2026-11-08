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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/dropdown-menu";
import { useState } from "react";
import type { Phase, Tournament, TopCutInput } from "tournament-engine";
import { createTopCut, dropParticipant, endTournament, reportResult } from "tournament-engine";

import { sortedPhases } from "../lookup.ts";
import { presetInfo, usesGrandFinal } from "../plan.ts";
import { type Next, nextStep, phaseHeading, randomWinner, roundMatches } from "../progress.ts";
import { type CallFn, useSession } from "../session.tsx";
import { BracketView } from "./bracket.tsx";
import { Standings } from "./standings.tsx";
import { SwissRounds } from "./swiss.tsx";

const TOOLBAR = "toolbar";
const PLAY_LIMIT = 500;

const END_LABEL = (
  <>
    <span className="max-sm:hidden">End tournament</span>
    <span className="sm:hidden">End</span>
  </>
);

function playRound(call: CallFn, start: Tournament, phaseId: string): Tournament {
  let tournament = start;
  const phase = tournament.phases.find((p) => p.id === phaseId);
  for (const match of phase === undefined ? [] : roundMatches(tournament, phase)) {
    const winnerId = randomWinner(match);
    if (winnerId !== null) {
      const current = tournament;
      tournament = call("reportResult", { matchId: match.id, winnerId }, (i) =>
        reportResult(current, i),
      );
    }
  }
  return tournament;
}

function unresolved(tournament: Tournament): number {
  const live = new Set(tournament.phases.filter((p) => p.status === "underway").map((p) => p.id));
  return tournament.matches.filter(
    (m) => live.has(m.phaseId) && (m.status === "open" || m.status === "pending"),
  ).length;
}

function EndButton({ primary, tournament }: { primary: boolean; tournament: Tournament }) {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const pending = unresolved(tournament);
  const end = (force: boolean) =>
    session.perform(TOOLBAR, null, (call) =>
      call("endTournament", { force }, (i) => endTournament(tournament, i)),
    );
  const variant = primary ? "primary" : "outline";

  if (pending === 0) {
    return (
      <Button variant={variant} aria-label="End tournament" onClick={() => end(false)}>
        {END_LABEL}
      </Button>
    );
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant={variant} aria-label="End tournament" onClick={() => setOpen(true)}>
        {END_LABEL}
      </Button>
      <DialogContent className="max-w-sm gap-5">
        <DialogHeader>
          <DialogTitle>End now?</DialogTitle>
          <DialogDescription>
            {pending} {pending === 1 ? "match has" : "matches have"} no result.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="md">
              Cancel
            </Button>
          </DialogClose>
          <Button
            size="md"
            onClick={() => {
              setOpen(false);
              end(true);
            }}
          >
            End tournament
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Actions({ next, tournament }: { next: Next; tournament: Tournament }) {
  const session = useSession();
  const plan = session.plan;

  switch (next.kind) {
    case "play": {
      const phaseId = next.phase.id;
      return (
        <>
          <Button
            onClick={() =>
              session.perform(TOOLBAR, "Play round", (call) => {
                playRound(call, tournament, phaseId);
              })
            }
          >
            Play round
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              session.perform(TOOLBAR, "Play all", (call) => {
                let t = tournament;
                for (let i = 0; i < PLAY_LIMIT; i++) {
                  const after = playRound(call, t, phaseId);
                  if (after === t) {
                    return;
                  }
                  t = after;
                }
              })
            }
          >
            Play all
          </Button>
          <EndButton primary={false} tournament={tournament} />
          <DropMenu tournament={tournament} />
        </>
      );
    }
    case "cut": {
      const format = plan === null ? null : presetInfo(plan.preset).cut;
      if (plan === null || format === null) {
        return null;
      }
      const input: TopCutInput = usesGrandFinal(plan.preset)
        ? { size: next.size, format, grandFinalType: plan.grandFinal }
        : { size: next.size, format };
      return (
        <>
          <Button
            onClick={() =>
              session.perform(TOOLBAR, null, (call) =>
                call("createTopCut", input, (i) => createTopCut(tournament, i)),
              )
            }
          >
            Create top {next.size}
          </Button>
          <EndButton primary={false} tournament={tournament} />
          <DropMenu tournament={tournament} />
        </>
      );
    }
    case "end":
      return (
        <>
          <EndButton primary tournament={tournament} />
          <DropMenu tournament={tournament} />
        </>
      );
    case "done":
      return <Button onClick={session.reset}>New tournament</Button>;
  }
}

function DropMenu({ tournament }: { tournament: Tournament }) {
  const session = useSession();
  const active = tournament.participants.filter((p) => p.status === "active");
  if (tournament.status !== "underway" || active.length === 0) {
    return null;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label="Drop a player">
          <span className="max-sm:hidden">Drop a player</span>
          <span className="sm:hidden">Drop</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
        {active.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onSelect={() =>
              session.perform(TOOLBAR, null, (call) =>
                call("dropParticipant", { participantId: p.id }, (i) =>
                  dropParticipant(tournament, i),
                ),
              )
            }
          >
            {p.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Matches({ phase, tournament }: { phase: Phase; tournament: Tournament }) {
  return (
    <section className="grid min-w-0 content-start gap-4">
      <h2 className="text-base font-medium">{phaseHeading(tournament, phase)}</h2>
      {phase.format === "swiss" ? (
        <SwissRounds phase={phase} tournament={tournament} />
      ) : (
        <BracketView phase={phase} tournament={tournament} />
      )}
    </section>
  );
}

export function Watch({ tournament }: { tournament: Tournament }) {
  const session = useSession();
  const next = nextStep(tournament, session.plan);
  const failure = session.failure?.scope === TOOLBAR ? session.failure : null;
  const shown = sortedPhases(tournament).at(-1) ?? tournament.phases[0];

  return (
    <div className="grid gap-8">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b pb-6">
        <div className="grid min-w-0 gap-1.5">
          <h1 className="text-xl leading-tight font-medium">{tournament.name}</h1>
          {failure === null ? (
            <p className="text-sm text-text-muted max-sm:min-h-[2lh]">
              {tournament.status === "complete"
                ? "Tournament complete. Start a new one to play again."
                : "Click a player to pick the winner. Edit changes a finished match."}
            </p>
          ) : (
            <p role="alert" className="text-sm text-error max-sm:min-h-[2lh]">
              {failure.message}
            </p>
          )}
        </div>
        <div className="flex h-9 items-center gap-2 overflow-x-auto max-sm:w-full [&>*]:shrink-0">
          <Actions next={next} tournament={tournament} />
        </div>
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
        <Matches phase={shown} tournament={tournament} />
        <aside className="grid min-w-0 content-start gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-10rem)] lg:overflow-y-auto">
          <Standings plan={session.plan} tournament={tournament} />
        </aside>
      </div>
    </div>
  );
}
