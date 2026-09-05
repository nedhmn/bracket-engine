import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { participantsTable, phasesTable } from "../../db/schema.ts";
import {
  createTopCut,
  dropParticipant,
  endTournament,
  reportResult,
  showTournament,
} from "../tournament.ts";
import { matchesFor, requireDefined, seedTournament, testDb, truncateAll } from "./helpers.ts";

const db = testDb();

async function playOutOpenMatches(phaseId: string) {
  let played = 0;
  for (;;) {
    const open = (await matchesFor(db, phaseId)).filter((m) => m.status === "open");
    if (open.length === 0) {
      return played;
    }
    for (const m of open) {
      await reportResult(db, m.id, requireDefined(m.player1Id, "player1"));
      played++;
    }
  }
}

describe("lifecycle", () => {
  beforeEach(() => truncateAll(db));
  afterAll(() => db.$client.end());

  it("swiss auto-pairs each round and a top cut seeds from the rankings", async () => {
    const { tournament, phase } = await seedTournament(db, "swiss", 8, 3);
    await playOutOpenMatches(phase.id);

    const [swiss] = await db.select().from(phasesTable).where(eq(phasesTable.id, phase.id));
    expect(swiss?.currentRound).toBe(3);
    expect((await matchesFor(db, phase.id)).every((m) => m.status !== "open")).toBe(true);

    const cut = await createTopCut(db, tournament.id, { format: "single_elimination", size: 4 });
    expect(cut.seeds).toHaveLength(4);
    expect((await matchesFor(db, cut.phase.id)).filter((m) => m.status === "open")).toHaveLength(2);

    await playOutOpenMatches(cut.phase.id);
    await endTournament(db, tournament.id);

    const { tournament: done, participants } = await showTournament(db, tournament.id);
    expect(done.status).toBe("complete");
    const standings = participants
      .map((p) => p.finalStanding)
      .toSorted((a, b) => (a ?? 0) - (b ?? 0));
    expect(standings.slice(0, 4)).toEqual([1, 2, 3, 3]);
    expect(standings.every((s) => s !== null)).toBe(true);
    const cutIds = new Set(cut.seeds.map((s) => s.participantId));
    const bestOutsideCut = Math.min(
      ...participants.filter((p) => !cutIds.has(p.id)).map((p) => p.finalStanding ?? 0),
    );
    expect(bestOutsideCut).toBeGreaterThan(4);
  });

  it("dropping a player forfeits their open match and the cascade follows dropped players", async () => {
    const { phase, participants } = await seedTournament(db, "single_elimination", 4);
    const p1 = requireDefined(participants[0], "p01");
    const before = await matchesFor(db, phase.id);
    const theirs = requireDefined(
      before.find((m) => m.status === "open" && (m.player1Id === p1.id || m.player2Id === p1.id)),
      "their match",
    );

    const result = await dropParticipant(db, p1.id);
    expect(result).toEqual({ action: "dropped", forfeited: 1 });

    const after = await matchesFor(db, phase.id);
    const forfeited = after.find((m) => m.id === theirs.id);
    expect(forfeited?.status).toBe("complete");
    expect(forfeited?.forfeit).toBe(true);
    expect(forfeited?.winnerId).toBe(
      theirs.player1Id === p1.id ? theirs.player2Id : theirs.player1Id,
    );
    const [row] = await db.select().from(participantsTable).where(eq(participantsTable.id, p1.id));
    expect(row?.status).toBe("dropped");
  });

  it("end refuses with unresolved matches unless forced", async () => {
    const { tournament } = await seedTournament(db, "double_elimination", 4);
    await expect(endTournament(db, tournament.id)).rejects.toThrow(/unresolved/);
    const done = await endTournament(db, tournament.id, true);
    expect(done?.status).toBe("complete");
  });
});
