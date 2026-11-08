import { describe, expect, it } from "vitest";

import {
  createTopCut,
  createTournament,
  dropParticipant,
  endTournament,
  joinTournament,
  reportResult,
  startTournament,
} from "../../src/index.ts";
import type { Tournament } from "../../src/index.ts";
import { expectCode, openIn, phaseId, player1, player2, required, seeded } from "./helpers.ts";

function pending(names: string[]): Tournament {
  let t = createTournament({ id: "t1", name: "pending", format: "swiss" }).tournament;
  for (const name of names) {
    t = joinTournament(t, { name }).tournament;
  }
  return t;
}

describe("create and join", () => {
  it("creates a pending tournament with one pending phase", () => {
    const { tournament, events } = createTournament({
      id: "t9",
      name: "de",
      format: "double_elimination",
    });
    expect(tournament.status).toBe("pending");
    expect(tournament.phases).toEqual([
      {
        id: "phase1",
        format: "double_elimination",
        position: 1,
        status: "pending",
        rounds: null,
        currentRound: null,
        grandFinalType: "double",
      },
    ]);
    expect(events).toEqual([{ type: "tournament_created", tournamentId: "t9" }]);
  });

  it("rejects a duplicate name and joins after the start", () => {
    const t = pending(["a", "b"]);
    expectCode(() => joinTournament(t, { name: "a" }), "duplicate_name");
    const started = startTournament(t, { seeding: ["p1", "p2"] }).tournament;
    expectCode(() => joinTournament(started, { name: "c" }), "join_closed");
  });

  it("never reuses a participant id after a removal", () => {
    const t = pending(["a", "b"]);
    const removed = dropParticipant(t, { participantId: "p2" });
    expect(removed.events).toEqual([{ type: "participant_removed", participantId: "p2" }]);
    expect(removed.tournament.participants.map((p) => p.id)).toEqual(["p1"]);
    const rejoined = joinTournament(removed.tournament, { name: "b" }).tournament;
    expect(rejoined.participants.map((p) => p.id)).toEqual(["p1", "p3"]);
  });
});

describe("start", () => {
  it("needs two participants and a full seeding", () => {
    expectCode(
      () => startTournament(pending(["a"]), { seeding: ["p1"] }),
      "not_enough_participants",
    );
    const t = pending(["a", "b", "c"]);
    expectCode(() => startTournament(t, { seeding: ["p1", "p2"] }), "invalid_seeding");
    expectCode(() => startTournament(t, { seeding: ["p1", "p1", "p2"] }), "invalid_seeding");
    expectCode(() => startTournament(t, { seeding: ["p1", "p2", "x"] }), "invalid_seeding");
  });

  it("seeds in the given order and derives swiss rounds", () => {
    const { tournament, events } = startTournament(pending(["a", "b", "c", "d", "e"]), {
      seeding: ["p5", "p4", "p3", "p2", "p1"],
    });
    expect(tournament.phaseParticipants.map((p) => [p.participantId, p.seed])).toEqual([
      ["p5", 1],
      ["p4", 2],
      ["p3", 3],
      ["p2", 4],
      ["p1", 5],
    ]);
    expect(tournament.phases[0]?.rounds).toBe(3);
    expect(tournament.phases[0]?.currentRound).toBe(1);
    expect(tournament.matches.filter((m) => m.status === "bye")).toHaveLength(1);
    expect(events.slice(0, 3)).toEqual([
      { type: "tournament_started", tournamentId: "t1" },
      { type: "phase_started", phaseId: "phase1" },
      { type: "swiss_round_paired", phaseId: "phase1", roundNumber: 1 },
    ]);
    expectCode(() => startTournament(tournament, { seeding: [] }), "already_started");
  });
});

describe("report", () => {
  it("rejects a closed match, an outsider, and a non-participant", () => {
    const t = seeded("single_elimination", 4);
    const [a, b] = openIn(t, phaseId(t, 1));
    const m0 = required(a, "m0");
    const m1 = required(b, "m1");
    expectCode(
      () => reportResult(t, { matchId: m0.id, winnerId: player1(m1) }),
      "winner_not_in_match",
    );
    expectCode(
      () => reportResult(t, { matchId: m0.id, winnerId: "nobody" }),
      "winner_not_in_phase",
    );
    const pendingMatch = required(
      t.matches.find((m) => m.status === "pending"),
      "pending match",
    );
    expectCode(
      () => reportResult(t, { matchId: pendingMatch.id, winnerId: player1(m0) }),
      "match_not_open",
    );
    expectCode(
      () => reportResult(t, { matchId: "nope", winnerId: player1(m0) }),
      "match_not_found",
    );
  });

  it("rejects reporting into a phase that end closed", () => {
    const t = seeded("single_elimination", 4);
    const open = required(openIn(t, phaseId(t, 1))[0], "open");
    const done = endTournament(t, { force: true }).tournament;
    expectCode(
      () => reportResult(done, { matchId: open.id, winnerId: player2(open) }),
      "phase_complete",
    );
  });
});

describe("drop", () => {
  it("rejects unknown, repeated, and completed drops", () => {
    const t = seeded("single_elimination", 2);
    expectCode(() => dropParticipant(t, { participantId: "x" }), "participant_not_found");
    const dropped = dropParticipant(t, { participantId: "p1" }).tournament;
    expectCode(() => dropParticipant(dropped, { participantId: "p1" }), "already_dropped");
    const done = endTournament(dropped, { force: false }).tournament;
    expectCode(() => dropParticipant(done, { participantId: "p2" }), "tournament_complete");
  });
});

describe("top cut", () => {
  it("follows a finished swiss phase only", () => {
    expectCode(
      () =>
        createTopCut(seeded("single_elimination", 4), { format: "single_elimination", size: 2 }),
      "top_cut_needs_swiss",
    );
    expectCode(
      () => createTopCut(pending(["a", "b"]), { format: "single_elimination", size: 2 }),
      "swiss_not_started",
    );
    const t = seeded("swiss", 4, 2);
    expectCode(
      () => createTopCut(t, { format: "single_elimination", size: 2 }),
      "swiss_rounds_left",
    );
  });

  it("needs every swiss match resolved and two players", () => {
    let t = seeded("swiss", 4, 1);
    expectCode(
      () => createTopCut(t, { format: "single_elimination", size: 2 }),
      "swiss_unresolved",
    );
    for (const m of openIn(t, phaseId(t, 1))) {
      t = reportResult(t, { matchId: m.id, winnerId: player1(m) }).tournament;
    }
    expectCode(
      () => createTopCut(t, { format: "single_elimination", size: 1 }),
      "top_cut_too_small",
    );
    const cut = createTopCut(t, { format: "double_elimination", size: 4 }).tournament;
    expect(cut.phases[1]?.grandFinalType).toBe("double");
    const done = endTournament(cut, { force: true }).tournament;
    expectCode(
      () => createTopCut(done, { format: "single_elimination", size: 2 }),
      "tournament_complete",
    );
  });
});

describe("end", () => {
  it("needs an underway tournament", () => {
    expectCode(() => endTournament(pending(["a", "b"]), { force: true }), "not_underway");
  });
});
