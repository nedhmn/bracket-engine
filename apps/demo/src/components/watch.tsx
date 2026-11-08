import { Button } from "@repo/design-system/components/button";
import { useState } from "react";
import type { Phase, Tournament, TopCutInput } from "tournament-engine";
import { createTopCut, endTournament, reportResult } from "tournament-engine";

import { activePhase, sortedPhases } from "../lookup.ts";
import { presetInfo, usesGrandFinal } from "../plan.ts";
import { type Next, nextStep, randomWinner, roundMatches, statusLine } from "../progress.ts";
import { type CallFn, useSession } from "../session.tsx";
import { BracketView } from "./bracket.tsx";
import { FailureText } from "./match.tsx";
import { Segmented } from "./segmented.tsx";
import { FinalStandings } from "./standings.tsx";
import { SwissView } from "./swiss.tsx";

const TOOLBAR = "toolbar";
const PLAY_LIMIT = 500;

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

function Actions({ next, tournament }: { next: Next; tournament: Tournament }) {
  const session = useSession();
  const plan = session.plan;

  const end = (force: boolean) =>
    session.perform(TOOLBAR, null, (call) =>
      call("endTournament", { force }, (i) => endTournament(tournament, i)),
    );

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
        <Button
          onClick={() =>
            session.perform(TOOLBAR, null, (call) =>
              call("createTopCut", input, (i) => createTopCut(tournament, i)),
            )
          }
        >
          Create top {next.size}
        </Button>
      );
    }
    case "end":
      return session.failure?.scope === TOOLBAR && session.failure.code === "unresolved_matches" ? (
        <Button variant="outline" className="text-error" onClick={() => end(true)}>
          End anyway
        </Button>
      ) : (
        <Button onClick={() => end(false)}>End tournament</Button>
      );
    case "done":
      return null;
  }
}

function phaseLabel(tournament: Tournament, phase: Phase): string {
  if (phase.format === "swiss") {
    return "Swiss";
  }
  const size = tournament.phaseParticipants.filter((p) => p.phaseId === phase.id).length;
  return phase.position === 1 ? "Bracket" : `Top ${size}`;
}

export function Watch({ tournament }: { tournament: Tournament }) {
  const session = useSession();
  const phases = sortedPhases(tournament);
  const active = activePhase(tournament) ?? phases[0];
  const [picked, setPicked] = useState<{ active: string; phase: string } | null>(null);
  const shown =
    phases.find((p) => p.id === (picked?.active === active.id ? picked.phase : active.id)) ??
    active;
  const next = nextStep(tournament, session.plan);

  return (
    <div className="grid gap-6">
      <div className="grid gap-2 border-b pb-5">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="grid min-w-0 gap-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h1 className="text-lg leading-tight font-medium">{tournament.name}</h1>
              {phases.length > 1 ? (
                <Segmented
                  label="Phase"
                  value={shown.id}
                  onChange={(id) => setPicked({ active: active.id, phase: id })}
                  options={phases.map((p) => ({ value: p.id, label: phaseLabel(tournament, p) }))}
                />
              ) : null}
            </div>
            <p className="text-sm text-text-secondary" aria-live="polite">
              {statusLine(tournament, next)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Actions next={next} tournament={tournament} />
          </div>
        </div>
        <FailureText scope={TOOLBAR} className="text-sm" />
      </div>
      {shown.format === "swiss" ? (
        <SwissView key={shown.id} phase={shown} tournament={tournament} />
      ) : (
        <BracketView phase={shown} tournament={tournament} />
      )}
      {tournament.status === "complete" ? <FinalStandings tournament={tournament} /> : null}
    </div>
  );
}
