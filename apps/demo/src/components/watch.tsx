import { Button } from "@repo/design-system/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/dropdown-menu";
import type { ReactNode } from "react";
import type { PhaseFormat, Tournament, TopCutInput } from "tournament-engine";
import { createTopCut, dropParticipant, endTournament, reportResult } from "tournament-engine";

import { sortedPhases } from "../lookup.ts";
import { type Plan, presetInfo, usesGrandFinal } from "../plan.ts";
import { type Next, nextStep, randomWinner, roundMatches, statusLine } from "../progress.ts";
import { type CallFn, useSession } from "../session.tsx";
import { BracketView } from "./bracket.tsx";
import { FailureText } from "./match.tsx";
import { FinalStandings, PhaseStandings, SwissStandings } from "./standings.tsx";
import { SwissRounds } from "./swiss.tsx";

const TOOLBAR = "toolbar";
const PLAY_LIMIT = 500;

const FORMAT_LABELS: Record<PhaseFormat, string> = {
  single_elimination: "Single elimination",
  double_elimination: "Double elimination",
  swiss: "Swiss",
};

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

function DropMenu({ tournament }: { tournament: Tournament }) {
  const session = useSession();
  const active = tournament.participants.filter((p) => p.status === "active");
  if (tournament.status !== "underway" || active.length === 0) {
    return null;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Drop a player</Button>
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

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="grid min-w-0 gap-4">
      <h2 className="text-base font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Sections({ plan, tournament }: { plan: Plan | null; tournament: Tournament }) {
  const phases = sortedPhases(tournament);
  const first = phases[0];
  const cut = phases.find((p) => p.position > 1);
  const complete = tournament.status === "complete";
  const standings = "max-w-2xl";

  if (first.format !== "swiss") {
    return (
      <>
        <Section title="Bracket">
          <BracketView phase={first} tournament={tournament} />
        </Section>
        <Section title={complete ? "Final standings" : "Standings"}>
          <div className={standings}>
            {complete ? (
              <FinalStandings tournament={tournament} />
            ) : (
              <PhaseStandings phase={first} tournament={tournament} />
            )}
          </div>
        </Section>
      </>
    );
  }

  const cutFormat = plan === null ? null : presetInfo(plan.preset).cut;
  const pendingCut = cutFormat !== null && cut === undefined && !complete;
  return (
    <>
      {cut === undefined ? null : (
        <>
          <Section title={`Top cut · ${FORMAT_LABELS[cut.format]}`}>
            <BracketView phase={cut} tournament={tournament} />
          </Section>
          <Section title={complete ? "Final standings" : "Top cut standings"}>
            <div className={standings}>
              {complete ? (
                <FinalStandings tournament={tournament} />
              ) : (
                <PhaseStandings phase={cut} tournament={tournament} />
              )}
            </div>
          </Section>
        </>
      )}
      <Section
        title={
          cutFormat === null ? (complete ? "Final standings" : "Standings") : "Swiss standings"
        }
      >
        <div className={standings}>
          <SwissStandings
            cut={pendingCut ? (plan?.topCut ?? null) : null}
            phase={first}
            tournament={tournament}
          />
        </div>
      </Section>
      <Section title={cutFormat === null ? "Rounds" : "Swiss rounds"}>
        <SwissRounds phase={first} tournament={tournament} />
      </Section>
    </>
  );
}

export function Watch({ tournament }: { tournament: Tournament }) {
  const session = useSession();
  const next = nextStep(tournament, session.plan);

  return (
    <div className="grid gap-12">
      <div className="grid gap-3 border-b pb-6">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="grid min-w-0 gap-1.5">
            <button
              type="button"
              className="mb-2 cursor-pointer justify-self-start text-sm text-text-secondary hover:text-text-primary"
              onClick={session.reset}
            >
              ← New tournament
            </button>
            <h1 className="text-xl leading-tight font-medium">{tournament.name}</h1>
            <p className="text-sm text-text-primary" aria-live="polite">
              {statusLine(tournament, next)}
            </p>
            {tournament.status === "complete" ? null : (
              <p className="text-sm text-text-muted">
                Click a player to make them the winner. Reopen undoes a result.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Actions next={next} tournament={tournament} />
            <DropMenu tournament={tournament} />
          </div>
        </div>
        <FailureText scope={TOOLBAR} className="text-sm" />
      </div>
      <Sections plan={session.plan} tournament={tournament} />
    </div>
  );
}
