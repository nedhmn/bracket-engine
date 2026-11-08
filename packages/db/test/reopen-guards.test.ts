import type { Match } from "tournament-engine";
import { reopenResult } from "tournament-engine";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { runAction } from "../src/tournament.ts";
import {
  matchesFor,
  removeCreated,
  report,
  requireDefined,
  seedTournament,
  testDb,
} from "./helpers.ts";

const db = testDb();

const shape = (rows: Match[]): string =>
  rows
    .map((r) => `${r.matchNumber}|${r.player1Id}|${r.player2Id}|${r.status}|${r.winnerId}`)
    .toSorted()
    .join(";");

describe("reopen guards", () => {
  afterEach(() => removeCreated(db));
  afterAll(() => db.$client.end());

  it("rejects reopening a bye and leaves it untouched", async () => {
    const t = await seedTournament(db, "single_elimination", 5);
    const bye = requireDefined(
      t.matches.find((m) => m.status === "bye"),
      "bye match",
    );

    await expect(runAction(db, t.id, (x) => reopenResult(x, { matchId: bye.id }))).rejects.toThrow(
      /bye/i,
    );

    const unchanged = (await matchesFor(db, t.id, bye.phaseId)).find((m) => m.id === bye.id);
    expect(unchanged?.status).toBe("bye");
    expect(unchanged?.winnerId).toBe(bye.winnerId);
  });

  it("reopen then re-report restores identical rows", async () => {
    const t = await seedTournament(db, "single_elimination", 4);
    const m = requireDefined(
      t.matches.find((x) => x.roundNumber === 1 && x.status === "open"),
      "open match",
    );
    const winner = requireDefined(m.player1Id, "player1");

    await report(db, t.id, m.id, winner);
    const afterReport = await matchesFor(db, t.id, m.phaseId);

    await runAction(db, t.id, (x) => reopenResult(x, { matchId: m.id }));
    await report(db, t.id, m.id, winner);
    const afterRoundTrip = await matchesFor(db, t.id, m.phaseId);

    expect(shape(afterRoundTrip)).toBe(shape(afterReport));
  });
});
