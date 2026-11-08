import { cn } from "@repo/design-system/lib/utils";
import type { BracketSection, Match, Phase, Tournament } from "tournament-engine";

import { groupBy, nameOf, phaseMatches, roundName } from "../lookup.ts";
import { FailureText, FinishedMatch, matchScope, PlayerPick, slotTone } from "./match.tsx";

const SECTION_LABELS: Record<BracketSection, string> = {
  winners: "Winners bracket",
  losers: "Losers bracket",
  grand_final: "Grand final",
};

const SLOT = "flex min-h-8 w-full min-w-0 items-center justify-between gap-2 px-2.5 py-1.5";

type BoxProps = {
  match: Match;
  seeds: Map<string, number>;
  tournament: Tournament;
};

function SlotBody({ id, seeds, tournament }: Omit<BoxProps, "match"> & { id: string }) {
  return (
    <>
      <span className="truncate">{nameOf(tournament, id)}</span>
      <span className="shrink-0 font-code text-xs text-text-faint">{seeds.get(id) ?? ""}</span>
    </>
  );
}

function Slot({ id, match, seeds, tournament }: BoxProps & { id: string | null }) {
  if (id === null) {
    const label = match.status === "bye" || match.status === "complete" ? "BYE" : "TBD";
    return <div className={cn(SLOT, "font-code text-xs text-text-faint")}>{label}</div>;
  }
  if (match.status === "open") {
    return (
      <PlayerPick className={SLOT} id={id} match={match} tournament={tournament}>
        <SlotBody id={id} seeds={seeds} tournament={tournament} />
      </PlayerPick>
    );
  }
  return (
    <div className={cn(SLOT, slotTone(match, id))}>
      <SlotBody id={id} seeds={seeds} tournament={tournament} />
    </div>
  );
}

function tagOf(match: Match): string {
  if (match.status === "unreachable") {
    return "not needed";
  }
  return match.forfeit ? "forfeit" : "";
}

function MatchBox(props: BoxProps) {
  const { match, tournament } = props;
  const box = cn(
    "grid w-full divide-y overflow-hidden rounded-md border text-sm",
    match.status === "open" && "border-border-bright shadow-[inset_2px_0_0_var(--accent)]",
    (match.status === "bye" || match.status === "unreachable") && "opacity-50",
  );
  const slots = (
    <>
      <Slot {...props} id={match.player1Id} />
      <Slot {...props} id={match.player2Id} />
    </>
  );
  return (
    <div className="grid gap-1">
      <div className="flex justify-between px-0.5 font-code text-[11px] text-text-faint">
        <span>M{match.matchNumber}</span>
        <span>{tagOf(match)}</span>
      </div>
      {match.status === "complete" ? (
        <FinishedMatch className={box} match={match} tournament={tournament}>
          {slots}
        </FinishedMatch>
      ) : (
        <div className={box}>{slots}</div>
      )}
      <FailureText scope={matchScope(match)} />
    </div>
  );
}

function columnName(phase: Phase, section: BracketSection | null, round: number, rounds: number) {
  if (section === "grand_final") {
    return round === 1 ? "Final" : "Reset";
  }
  if (phase.format === "single_elimination") {
    return roundName(phase.format, section, round, rounds);
  }
  return round === rounds ? "Final" : `Round ${round}`;
}

function Rounds({
  matches,
  phase,
  ...props
}: Omit<BoxProps, "match"> & { matches: Match[]; phase: Phase }) {
  const columns = groupBy(matches, (m) => m.roundNumber);
  const rounds = Math.max(...columns.keys());
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex w-max gap-4">
        {[...columns].map(([round, list]) => (
          <div key={round} className="flex w-52 shrink-0 flex-col">
            <div className="pb-2 font-code text-[11px] tracking-wider text-text-muted uppercase">
              {columnName(phase, list.at(0)?.bracketSection ?? null, round, rounds)}
            </div>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {list.map((m) => (
                <MatchBox key={m.id} match={m} {...props} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BracketView({ phase, tournament }: { phase: Phase; tournament: Tournament }) {
  const seeds = new Map(
    tournament.phaseParticipants
      .filter((p) => p.phaseId === phase.id)
      .map((p) => [p.participantId, p.seed]),
  );
  const matches = phaseMatches(tournament, phase.id);
  const sections = groupBy(matches, (m) => m.bracketSection);

  if (phase.format === "single_elimination" || sections.size === 1) {
    return <Rounds matches={matches} phase={phase} seeds={seeds} tournament={tournament} />;
  }
  return (
    <div className="grid min-w-0 divide-y">
      {[...sections].map(([key, list]) => (
        <section key={key ?? "bracket"} className="grid min-w-0 gap-3 py-5 first:pt-0">
          <h2 className="text-sm font-medium">{key === null ? "Bracket" : SECTION_LABELS[key]}</h2>
          <Rounds matches={list} phase={phase} seeds={seeds} tournament={tournament} />
        </section>
      ))}
    </div>
  );
}
