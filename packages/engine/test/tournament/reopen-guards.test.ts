import { describe, expect, it } from "vitest";

import {
  canReopenResult,
  dropParticipant,
  endTournament,
  reopenResult,
  reportResult,
} from "../../src/index.ts";
import type { Tournament } from "../../src/index.ts";
import {
  expectCode,
  matchesIn,
  openIn,
  phaseId,
  player1,
  player2,
  required,
  seeded,
} from "./helpers.ts";

const shape = (t: Tournament) =>
  t.matches
    .map((r) => `${r.id}|${r.player1Id}|${r.player2Id}|${r.status}|${r.winnerId}|${r.forfeit}`)
    .toSorted()
    .join(";");

describe("reopen guards", () => {
  it("rejects reopening a bye", () => {
    const t = seeded("single_elimination", 5);
    const bye = required(
      matchesIn(t, phaseId(t, 1)).find((m) => m.status === "bye"),
      "bye match",
    );
    expectCode(() => reopenResult(t, { matchId: bye.id }), "bye_not_reopenable");
    expect(canReopenResult(t, { matchId: bye.id })).toBe(false);
  });

  it("reopen then re-report restores identical matches", () => {
    const t = seeded("single_elimination", 4);
    const m = required(
      openIn(t, phaseId(t, 1)).find((x) => x.roundNumber === 1),
      "open match",
    );
    const reported = reportResult(t, { matchId: m.id, winnerId: player1(m) }).tournament;
    expect(canReopenResult(reported, { matchId: m.id })).toBe(true);
    const reopened = reopenResult(reported, { matchId: m.id });
    expect(reopened.events).toEqual([
      { type: "match_reopened", matchId: m.id },
      { type: "match_opened", matchId: m.id },
    ]);
    const again = reportResult(reopened.tournament, { matchId: m.id, winnerId: player1(m) });
    expect(shape(again.tournament)).toBe(shape(reported));
  });

  it("reopen clears the downstream slot it fed", () => {
    const t = seeded("single_elimination", 4);
    const [a, b] = openIn(t, phaseId(t, 1));
    const m0 = required(a, "m0");
    const m1 = required(b, "m1");
    const both = reportResult(
      reportResult(t, { matchId: m0.id, winnerId: player1(m0) }).tournament,
      { matchId: m1.id, winnerId: player2(m1) },
    ).tournament;
    const final = required(m0.nextMatchId, "final id");
    expect(both.matches.find((m) => m.id === final)?.status).toBe("open");

    const reopened = reopenResult(both, { matchId: m0.id }).tournament;
    const after = reopened.matches.find((m) => m.id === final);
    expect(after?.status).toBe("pending");
    expect(after?.player1Id).toBeNull();
    expect(after?.player2Id).toBe(player2(m1));
  });

  it("rejects reopening a match that has no result", () => {
    const t = seeded("single_elimination", 4);
    const open = required(openIn(t, phaseId(t, 1))[0], "open match");
    expectCode(() => reopenResult(t, { matchId: open.id }), "match_not_complete");
    expect(canReopenResult(t, { matchId: open.id })).toBe(false);
    const pending = required(
      t.matches.find((m) => m.status === "pending"),
      "pending match",
    );
    expectCode(() => reopenResult(t, { matchId: pending.id }), "match_not_complete");
    expect(canReopenResult(t, { matchId: pending.id })).toBe(false);
  });

  it("rejects reopening a swiss round that later pairings came from", () => {
    let t = seeded("swiss", 4, 2);
    const swiss = phaseId(t, 1);
    const roundOne = openIn(t, swiss);
    for (const m of roundOne) {
      t = reportResult(t, { matchId: m.id, winnerId: player1(m) }).tournament;
    }
    expect(t.phases[0]?.currentRound).toBe(2);
    const first = required(roundOne[0], "round one match");
    expectCode(() => reopenResult(t, { matchId: first.id }), "later_round_paired");
    expect(canReopenResult(t, { matchId: first.id })).toBe(false);

    const current = required(openIn(t, swiss)[0], "round two match");
    const reported = reportResult(t, { matchId: current.id, winnerId: player1(current) });
    expect(reopenResult(reported.tournament, { matchId: current.id }).tournament).toBeDefined();
  });

  it("rejects reopening a forfeit by a dropped participant", () => {
    const t = seeded("single_elimination", 4);
    const theirs = required(
      openIn(t, phaseId(t, 1)).find((m) => m.player1Id === "p1" || m.player2Id === "p1"),
      "their match",
    );
    const dropped = dropParticipant(t, { participantId: "p1" }).tournament;
    expectCode(() => reopenResult(dropped, { matchId: theirs.id }), "dropped_participant");
    expect(canReopenResult(dropped, { matchId: theirs.id })).toBe(false);
  });

  it("rejects reopening once the phase is complete", () => {
    const t = seeded("single_elimination", 2);
    const m = required(openIn(t, phaseId(t, 1))[0], "final");
    const reported = reportResult(t, { matchId: m.id, winnerId: player1(m) }).tournament;
    const done = endTournament(reported, { force: false }).tournament;
    expectCode(() => reopenResult(done, { matchId: m.id }), "phase_complete");
    expect(canReopenResult(done, { matchId: m.id })).toBe(false);
  });

  it("rejects an unknown match", () => {
    expectCode(
      () => reopenResult(seeded("single_elimination", 2), { matchId: "x" }),
      "match_not_found",
    );
  });
});
