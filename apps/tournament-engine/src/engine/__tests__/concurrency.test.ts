import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { advanceMatchResult } from "../elimination.ts";
import { matchesFor, requireDefined, seedTournament, testDb, truncateAll } from "./helpers.ts";

const db = testDb();

describe("concurrency", () => {
  beforeEach(() => truncateAll(db));
  afterAll(() => db.$client.end());

  it("two sibling quarterfinal reports racing into one semifinal both land", async () => {
    const { phase } = await seedTournament(db, "single_elimination", 8);
    const r1 = (await matchesFor(db, phase.id))
      .filter((m) => m.roundNumber === 1)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);
    const [m0, m1] = r1;
    const winner0 = requireDefined(m0?.player1Id, "player");
    const winner1 = requireDefined(m1?.player1Id, "player");

    await Promise.all([
      db.transaction((tx) => advanceMatchResult(tx, requireDefined(m0, "match").id, winner0)),
      db.transaction((tx) => advanceMatchResult(tx, requireDefined(m1, "match").id, winner1)),
    ]);

    const after = await matchesFor(db, phase.id);
    const sf = after.find((m) => m.id === m0?.nextMatchId);
    expect(sf?.player1Id).toBe(winner0);
    expect(sf?.player2Id).toBe(winner1);
    expect(sf?.status).toBe("open");
  });

  it("double report on one match: exactly one wins, the other is rejected", async () => {
    const { phase } = await seedTournament(db, "single_elimination", 4);
    const m = requireDefined(
      (await matchesFor(db, phase.id)).find((x) => x.roundNumber === 1 && x.status === "open"),
      "open match",
    );
    const p1 = requireDefined(m.player1Id, "player1");
    const p2 = requireDefined(m.player2Id, "player2");

    const results = await Promise.allSettled([
      db.transaction((tx) => advanceMatchResult(tx, m.id, p1)),
      db.transaction((tx) => advanceMatchResult(tx, m.id, p2)),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);

    const after = await matchesFor(db, phase.id);
    const reported = after.find((x) => x.id === m.id);
    expect(reported?.status).toBe("complete");
    const downstream = after.find((x) => x.id === m.nextMatchId);
    const filled = [downstream?.player1Id, downstream?.player2Id].filter(
      (id) => id !== null && id !== undefined,
    );
    expect(filled).toEqual([reported?.winnerId]);
  });

  it("rejects a winner who is not in the match", async () => {
    const { phase, participants } = await seedTournament(db, "single_elimination", 4);
    const m = requireDefined(
      (await matchesFor(db, phase.id)).find((x) => x.roundNumber === 1 && x.status === "open"),
      "open match",
    );
    const outsider = requireDefined(
      participants.find((p) => p.id !== m.player1Id && p.id !== m.player2Id),
      "outsider",
    );

    await expect(db.transaction((tx) => advanceMatchResult(tx, m.id, outsider.id))).rejects.toThrow(
      /participants/,
    );
    expect((await matchesFor(db, phase.id)).find((x) => x.id === m.id)?.status).toBe("open");
  });
});
