import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { advanceMatchResult, reopenMatchAndCascade } from "../elimination.ts";
import { matchesFor, requireDefined, seedTournament, testDb, truncateAll } from "./helpers.ts";

const db = testDb();

const shape = (rows: Awaited<ReturnType<typeof matchesFor>>) =>
  rows
    .map((r) => `${r.matchNumber}|${r.player1Id}|${r.player2Id}|${r.status}|${r.winnerId}`)
    .toSorted()
    .join(";");

describe("reopen guards", () => {
  beforeEach(() => truncateAll(db));
  afterAll(() => db.$client.end());

  it("rejects reopening a bye and leaves it untouched", async () => {
    const { phase } = await seedTournament(db, "single_elimination", 5);
    const bye = requireDefined(
      (await matchesFor(db, phase.id)).find((m) => m.status === "bye"),
      "bye match",
    );

    await expect(db.transaction((tx) => reopenMatchAndCascade(tx, bye.id))).rejects.toThrow(/bye/i);

    const unchanged = (await matchesFor(db, phase.id)).find((m) => m.id === bye.id);
    expect(unchanged?.status).toBe("bye");
    expect(unchanged?.winnerId).toBe(bye.winnerId);
  });

  it("reopen then re-report restores identical rows", async () => {
    const { phase } = await seedTournament(db, "single_elimination", 4);
    const m = requireDefined(
      (await matchesFor(db, phase.id)).find((x) => x.roundNumber === 1 && x.status === "open"),
      "open match",
    );
    const winner = requireDefined(m.player1Id, "player1");

    await db.transaction((tx) => advanceMatchResult(tx, m.id, winner));
    const afterReport = await matchesFor(db, phase.id);

    await db.transaction((tx) => reopenMatchAndCascade(tx, m.id));
    await db.transaction((tx) => advanceMatchResult(tx, m.id, winner));
    const afterRoundTrip = await matchesFor(db, phase.id);

    expect(shape(afterRoundTrip)).toBe(shape(afterReport));
  });
});
