import { joinTournament, TournamentError } from "tournament-engine";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { loadTournament, runAction } from "../src/tournament.ts";
import {
  matchesFor,
  newTournament,
  removeCreated,
  report,
  requireDefined,
  seedTournament,
  testDb,
} from "./helpers.ts";

const db = testDb();

describe("concurrency", () => {
  afterEach(() => removeCreated(db));
  afterAll(() => db.$client.end());

  it("two sibling quarterfinal reports racing into one semifinal both land", async () => {
    const t = await seedTournament(db, "single_elimination", 8);
    const [m0, m1] = t.matches
      .filter((m) => m.roundNumber === 1)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);
    const first = requireDefined(m0, "match");
    const second = requireDefined(m1, "match");
    const winner0 = requireDefined(first.player1Id, "player");
    const winner1 = requireDefined(second.player1Id, "player");

    await Promise.all([report(db, t.id, first.id, winner0), report(db, t.id, second.id, winner1)]);

    const after = await matchesFor(db, t.id, first.phaseId);
    const sf = after.find((m) => m.id === first.nextMatchId);
    expect(sf?.player1Id).toBe(winner0);
    expect(sf?.player2Id).toBe(winner1);
    expect(sf?.status).toBe("open");
  });

  it("double report on one match: exactly one wins, the other is rejected", async () => {
    const t = await seedTournament(db, "single_elimination", 4);
    const m = requireDefined(
      t.matches.find((x) => x.roundNumber === 1 && x.status === "open"),
      "open match",
    );
    const p1 = requireDefined(m.player1Id, "player1");
    const p2 = requireDefined(m.player2Id, "player2");

    const results = await Promise.allSettled([
      report(db, t.id, m.id, p1),
      report(db, t.id, m.id, p2),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected?.reason).toBeInstanceOf(TournamentError);
    expect(rejected?.reason).toMatchObject({ code: "match_not_open" });

    const after = await matchesFor(db, t.id, m.phaseId);
    const reported = after.find((x) => x.id === m.id);
    expect(reported?.status).toBe("complete");
    const downstream = after.find((x) => x.id === m.nextMatchId);
    const filled = [downstream?.player1Id, downstream?.player2Id].filter(
      (id) => id !== null && id !== undefined,
    );
    expect(filled).toEqual([reported?.winnerId]);
  });

  it("the last two reports of a swiss round racing pair the next round once", async () => {
    const t = await seedTournament(db, "swiss", 4, 2);
    const open = t.matches.filter((m) => m.status === "open");
    expect(open).toHaveLength(2);

    await Promise.all(
      open.map((m) => report(db, t.id, m.id, requireDefined(m.player1Id, "player1"))),
    );

    const after = await loadTournament(db, t.id);
    expect(after.phases[0]?.currentRound).toBe(2);
    expect(after.matches.filter((m) => m.roundNumber === 2)).toHaveLength(2);
    expect(after.matches.filter((m) => m.status === "open")).toHaveLength(2);
  });

  it("two joins racing with one name: exactly one lands", async () => {
    const id = await newTournament(db, "race", "swiss");
    const results = await Promise.allSettled([
      runAction(db, id, (t) => joinTournament(t, { name: "Ana" })),
      runAction(db, id, (t) => joinTournament(t, { name: "Ana" })),
    ]);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected?.reason).toMatchObject({ code: "duplicate_name" });
    expect((await loadTournament(db, id)).participants).toHaveLength(1);
  });

  it("rejects a winner who is not in the match and leaves the row open", async () => {
    const t = await seedTournament(db, "single_elimination", 4);
    const m = requireDefined(
      t.matches.find((x) => x.roundNumber === 1 && x.status === "open"),
      "open match",
    );
    const outsider = requireDefined(
      t.participants.find((p) => p.id !== m.player1Id && p.id !== m.player2Id),
      "outsider",
    );

    await expect(report(db, t.id, m.id, outsider.id)).rejects.toMatchObject({
      code: "winner_not_in_match",
    });
    expect((await matchesFor(db, t.id, m.phaseId)).find((x) => x.id === m.id)?.status).toBe("open");
  });
});
