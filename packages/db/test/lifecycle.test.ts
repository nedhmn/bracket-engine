import type { Tournament } from "tournament-engine";
import { createTopCut, dropParticipant, endTournament } from "tournament-engine";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { loadTournament, runAction } from "../src/tournament.ts";
import {
  matchesFor,
  removeCreated,
  report,
  requireDefined,
  seedTournament,
  testDb,
} from "./helpers.ts";

const db = testDb();

async function playOutOpenMatches(tournamentId: string, phaseId: string): Promise<Tournament> {
  for (;;) {
    const open = (await matchesFor(db, tournamentId, phaseId)).filter((m) => m.status === "open");
    if (open.length === 0) {
      return await loadTournament(db, tournamentId);
    }
    for (const m of open) {
      await report(db, tournamentId, m.id, requireDefined(m.player1Id, "player1"));
    }
  }
}

const byKey = <T>(rows: T[], key: (row: T) => string): T[] =>
  rows.toSorted((a, b) => key(a).localeCompare(key(b)));

function normalize(t: Tournament): Omit<Tournament, "participantSequence"> {
  const { participantSequence: _, ...rest } = t;
  return {
    ...rest,
    participants: byKey(t.participants, (p) => p.id),
    phases: byKey(t.phases, (p) => p.id),
    phaseParticipants: byKey(t.phaseParticipants, (p) => `${p.phaseId}:${p.participantId}`),
    matches: byKey(t.matches, (m) => m.id),
  };
}

describe("lifecycle", () => {
  afterEach(() => removeCreated(db));
  afterAll(() => db.$client.end());

  it("swiss auto-pairs each round and a top cut seeds from the rankings", async () => {
    const t = await seedTournament(db, "swiss", 8, 3);
    const swissId = requireDefined(t.phases[0], "swiss phase").id;
    const played = await playOutOpenMatches(t.id, swissId);

    expect(played.phases.find((p) => p.id === swissId)?.currentRound).toBe(3);
    expect(played.matches.every((m) => m.status !== "open")).toBe(true);

    const cut = await runAction(db, t.id, (x) =>
      createTopCut(x, { format: "single_elimination", size: 4 }),
    );
    const cutPhase = requireDefined(
      cut.tournament.phases.find((p) => p.position === 2),
      "top cut phase",
    );
    const cutSeeds = cut.tournament.phaseParticipants.filter((p) => p.phaseId === cutPhase.id);
    expect(cutSeeds).toHaveLength(4);
    expect(
      (await matchesFor(db, t.id, cutPhase.id)).filter((m) => m.status === "open"),
    ).toHaveLength(2);

    await playOutOpenMatches(t.id, cutPhase.id);
    await runAction(db, t.id, (x) => endTournament(x, { force: false }));

    const done = await loadTournament(db, t.id);
    expect(done.status).toBe("complete");
    const standings = done.participants
      .map((p) => p.finalStanding)
      .toSorted((a, b) => (a ?? 0) - (b ?? 0));
    expect(standings.slice(0, 4)).toEqual([1, 2, 3, 3]);
    expect(standings.every((s) => s !== null)).toBe(true);
    const cutIds = new Set(cutSeeds.map((s) => s.participantId));
    const bestOutsideCut = Math.min(
      ...done.participants.filter((p) => !cutIds.has(p.id)).map((p) => p.finalStanding ?? 0),
    );
    expect(bestOutsideCut).toBeGreaterThan(4);
  });

  it("dropping a player forfeits their open match and the cascade follows dropped players", async () => {
    const t = await seedTournament(db, "single_elimination", 4);
    const p1 = requireDefined(t.participants[0], "p01");
    const theirs = requireDefined(
      t.matches.find(
        (m) => m.status === "open" && (m.player1Id === p1.id || m.player2Id === p1.id),
      ),
      "their match",
    );

    const result = await runAction(db, t.id, (x) => dropParticipant(x, { participantId: p1.id }));
    expect(result.events).toContainEqual({ type: "participant_dropped", participantId: p1.id });

    const after = await loadTournament(db, t.id);
    const forfeited = after.matches.find((m) => m.id === theirs.id);
    expect(forfeited?.status).toBe("complete");
    expect(forfeited?.forfeit).toBe(true);
    expect(forfeited?.winnerId).toBe(
      theirs.player1Id === p1.id ? theirs.player2Id : theirs.player1Id,
    );
    expect(after.participants.find((p) => p.id === p1.id)?.status).toBe("dropped");
  });

  it("end refuses with unresolved matches unless forced", async () => {
    const t = await seedTournament(db, "double_elimination", 4);
    await expect(runAction(db, t.id, (x) => endTournament(x, { force: false }))).rejects.toThrow(
      /unresolved/,
    );
    expect((await loadTournament(db, t.id)).status).toBe("underway");
    const { tournament } = await runAction(db, t.id, (x) => endTournament(x, { force: true }));
    expect(tournament.status).toBe("complete");
  });

  it("a saved tournament loads back identical to the action's result", async () => {
    const t = await seedTournament(db, "double_elimination", 6);
    const m = requireDefined(
      t.matches.find((x) => x.status === "open"),
      "open match",
    );
    await report(db, t.id, m.id, requireDefined(m.player2Id, "player2"));
    const dropped = requireDefined(t.participants[2], "p03");
    const last = await runAction(db, t.id, (x) =>
      dropParticipant(x, { participantId: dropped.id }),
    );

    expect(normalize(await loadTournament(db, t.id))).toEqual(normalize(last.tournament));
    expect(last.tournament.matches.every((x) => x.id.length === 36)).toBe(true);
  });
});
