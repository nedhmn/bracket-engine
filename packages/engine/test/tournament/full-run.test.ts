import { describe, expect, it } from "vitest";

import {
  createTopCut,
  createTournament,
  dropParticipant,
  endTournament,
  joinTournament,
  reopenResult,
  reportResult,
  startTournament,
  swissRankings,
} from "../../src/index.ts";
import type {
  ActionResult,
  CreateTournamentInput,
  Match,
  Tournament,
  TournamentEvent,
} from "../../src/index.ts";
import { matchesIn, openIn, phaseId, player1, player2, required } from "./helpers.ts";

type Apply = (action: (t: Tournament) => ActionResult) => Tournament;

type Run = {
  events: TournamentEvent[][];
  states: Tournament[];
};

function deepFreeze(t: Tournament): void {
  for (const rows of [t.participants, t.phases, t.phaseParticipants, t.matches]) {
    for (const row of rows) {
      Object.freeze(row);
    }
    Object.freeze(rows);
  }
  Object.freeze(t);
}

function run(
  create: CreateTournamentInput,
  script: (apply: Apply) => void,
  roundTrip: boolean,
): Run {
  const created = createTournament(create);
  const out: Run = { events: [created.events], states: [created.tournament] };
  let current = created.tournament;
  script((action) => {
    const input: Tournament = roundTrip ? JSON.parse(JSON.stringify(current)) : current;
    const before = JSON.stringify(input);
    deepFreeze(input);
    const result = action(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(JSON.parse(JSON.stringify(result.tournament))).toStrictEqual(result.tournament);
    out.events.push(result.events);
    out.states.push(result.tournament);
    current = result.tournament;
    return current;
  });
  return out;
}

const winnerOf = (m: Match) => (m.matchNumber % 2 === 1 ? player1(m) : player2(m));

function joinAll(apply: Apply, count: number): Tournament {
  let t: Tournament | null = null;
  for (let i = 1; i <= count; i++) {
    t = apply((s) => joinTournament(s, { name: `p${String(i).padStart(2, "0")}` }));
  }
  return required(t, "joined tournament");
}

function reportAll(apply: Apply, t: Tournament, phase: string): Tournament {
  let current = t;
  for (let open = openIn(current, phase)[0]; open; open = openIn(current, phase)[0]) {
    const m = open;
    current = apply((s) => reportResult(s, { matchId: m.id, winnerId: winnerOf(m) }));
  }
  return current;
}

const SWISS: CreateTournamentInput = {
  id: "swiss16",
  name: "swiss 16",
  format: "swiss",
  rounds: 4,
};
function swissIntoTopEight(apply: Apply): void {
  const joined = joinAll(apply, 16);
  let t = apply((s) =>
    startTournament(s, { seeding: joined.participants.map((p) => p.id).toReversed() }),
  );
  const swiss = phaseId(t, 1);
  for (const m of openIn(t, swiss)) {
    t = apply((s) => reportResult(s, { matchId: m.id, winnerId: winnerOf(m) }));
  }

  const roundTwo = openIn(t, swiss);
  const last = required(roundTwo.at(-1), "last round two match");
  for (const m of roundTwo.slice(0, -1)) {
    t = apply((s) => reportResult(s, { matchId: m.id, winnerId: winnerOf(m) }));
  }
  const first = required(roundTwo[0], "first round two match");
  t = apply((s) => reopenResult(s, { matchId: first.id }));
  const flipped = winnerOf(first) === player1(first) ? player2(first) : player1(first);
  t = apply((s) => reportResult(s, { matchId: first.id, winnerId: flipped }));
  t = apply((s) => dropParticipant(s, { participantId: player2(last) }));

  t = reportAll(apply, t, swiss);
  t = apply((s) => createTopCut(s, { format: "single_elimination", size: 8 }));
  t = reportAll(apply, t, phaseId(t, 2));
  apply((s) => endTournament(s, { force: false }));
}

const DE: CreateTournamentInput = { id: "de6", name: "de 6", format: "double_elimination" };

function doubleElimination(apply: Apply): void {
  const joined = joinAll(apply, 6);
  let t = apply((s) => startTournament(s, { seeding: joined.participants.map((p) => p.id) }));
  const bracket = phaseId(t, 1);
  const opener = required(openIn(t, bracket)[0], "opener");
  t = apply((s) => reportResult(s, { matchId: opener.id, winnerId: player1(opener) }));
  t = apply((s) => reopenResult(s, { matchId: opener.id }));
  t = apply((s) => reportResult(s, { matchId: opener.id, winnerId: player2(opener) }));
  t = apply((s) => dropParticipant(s, { participantId: "p6" }));
  t = reportAll(apply, t, bracket);
  apply((s) => endTournament(s, { force: true }));
}

describe("swiss into a top 8", () => {
  const { states, events } = run(SWISS, swissIntoTopEight, false);
  const done = required(states.at(-1), "final state");
  const swiss = phaseId(done, 1);
  const cut = phaseId(done, 2);
  const flat = events.flat();
  const dropped = required(
    done.participants.find((p) => p.status === "dropped"),
    "dropped participant",
  ).id;

  it("plays four swiss rounds around a reopen and a drop", () => {
    expect(done.phases.find((p) => p.id === swiss)).toMatchObject({
      status: "complete",
      currentRound: 4,
      rounds: 4,
    });
    expect(flat.filter((e) => e.type === "swiss_round_paired")).toHaveLength(4);
    expect(flat.filter((e) => e.type === "match_reopened")).toHaveLength(1);
    expect(flat).toContainEqual({ type: "participant_dropped", participantId: dropped });

    const later = matchesIn(done, swiss).filter((m) => m.roundNumber > 2);
    expect(later.some((m) => m.player1Id === dropped || m.player2Id === dropped)).toBe(false);
    expect(later.filter((m) => m.status === "bye")).toHaveLength(2);
    const forfeit = matchesIn(done, swiss).filter((m) => m.forfeit);
    expect(forfeit).toHaveLength(1);
    expect(forfeit[0]?.roundNumber).toBe(2);
  });

  it("seeds the cut from the final swiss rankings", () => {
    const beforeCut = required(
      states.find((s) => s.phases.length === 2),
      "state with the cut",
    );
    const previous = required(states[states.indexOf(beforeCut) - 1], "state before the cut");
    const expected = swissRankings(previous, swiss)
      .slice(0, 8)
      .map((r, i) => [r.participantId, i + 1]);
    expect(
      beforeCut.phaseParticipants
        .filter((p) => p.phaseId === cut)
        .map((p) => [p.participantId, p.seed]),
    ).toEqual(expected);
    expect(openIn(beforeCut, cut)).toHaveLength(4);
  });

  it("ranks the cut above the field", () => {
    expect(done.status).toBe("complete");
    const cutIds = new Set(
      done.phaseParticipants.filter((p) => p.phaseId === cut).map((p) => p.participantId),
    );
    const rankOf = (id: string) =>
      required(done.participants.find((p) => p.id === id)?.finalStanding, `rank of ${id}`);
    expect([...cutIds].map(rankOf).toSorted((a, b) => a - b)).toEqual([1, 2, 3, 3, 5, 5, 5, 5]);
    const field = done.participants.filter((p) => !cutIds.has(p.id)).map((p) => rankOf(p.id));
    expect(Math.min(...field)).toBe(9);
    expect(flat.at(-1)).toEqual({ type: "tournament_completed", tournamentId: "swiss16" });
  });
});

describe("purity", () => {
  it.each([
    ["swiss into a top 8", SWISS, swissIntoTopEight],
    ["double elimination with a reopen and a drop", DE, doubleElimination],
  ] as const)("%s: a JSON round-trip between actions changes nothing", (_, create, script) => {
    const direct = run(create, script, false);
    const roundTripped = run(create, script, true);
    expect(roundTripped.states).toStrictEqual(direct.states);
    expect(roundTripped.events).toStrictEqual(direct.events);
  });

  it("double elimination finishes with every match settled", () => {
    const { states } = run(DE, doubleElimination, false);
    const done = required(states.at(-1), "final state");
    expect(done.status).toBe("complete");
    expect(done.matches.some((m) => m.status === "open")).toBe(false);
    expect(done.participants.every((p) => p.finalStanding !== null)).toBe(true);
  });
});
