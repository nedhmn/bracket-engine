import { describe, expect, it } from "vitest";

import { createTopCut, dropParticipant, endTournament, reportResult } from "../../src/index.ts";
import {
  expectCode,
  matchesIn,
  openIn,
  phaseId,
  player1,
  player2,
  playOut,
  required,
  seeded,
} from "./helpers.ts";

describe("lifecycle", () => {
  it("swiss auto-pairs each round and a top cut seeds from the rankings", () => {
    const start = seeded("swiss", 8, 3);
    const swissId = phaseId(start, 1);
    const played = playOut(start, swissId);

    expect(played.phases.find((p) => p.id === swissId)?.currentRound).toBe(3);
    expect(matchesIn(played, swissId).every((m) => m.status !== "open")).toBe(true);

    const cut = createTopCut(played, { format: "single_elimination", size: 4 }).tournament;
    const cutId = phaseId(cut, 2);
    expect(cut.phaseParticipants.filter((p) => p.phaseId === cutId)).toHaveLength(4);
    expect(openIn(cut, cutId)).toHaveLength(2);
    expect(cut.phases.find((p) => p.id === swissId)?.status).toBe("complete");

    const done = endTournament(playOut(cut, cutId), { force: false }).tournament;
    expect(done.status).toBe("complete");
    const standings = done.participants
      .map((p) => required(p.finalStanding, `standing of ${p.id}`))
      .toSorted((a, b) => a - b);
    expect(standings.slice(0, 4)).toEqual([1, 2, 3, 3]);
    const cutIds = new Set(
      done.phaseParticipants.filter((p) => p.phaseId === cutId).map((p) => p.participantId),
    );
    const bestOutsideCut = Math.min(
      ...done.participants.filter((p) => !cutIds.has(p.id)).map((p) => p.finalStanding ?? 0),
    );
    expect(bestOutsideCut).toBeGreaterThan(4);
  });

  it("dropping a player forfeits their open match", () => {
    const t = seeded("single_elimination", 4);
    const bracket = phaseId(t, 1);
    const theirs = required(
      openIn(t, bracket).find((m) => m.player1Id === "p1" || m.player2Id === "p1"),
      "their match",
    );

    const { tournament, events } = dropParticipant(t, { participantId: "p1" });
    const forfeited = tournament.matches.find((m) => m.id === theirs.id);
    const opponent = theirs.player1Id === "p1" ? player2(theirs) : player1(theirs);
    expect(forfeited?.status).toBe("complete");
    expect(forfeited?.forfeit).toBe(true);
    expect(forfeited?.winnerId).toBe(opponent);
    expect(tournament.participants.find((p) => p.id === "p1")?.status).toBe("dropped");
    expect(events).toEqual([
      { type: "participant_dropped", participantId: "p1" },
      { type: "match_reported", matchId: theirs.id, winnerId: opponent, forfeit: true },
    ]);
  });

  it("the cascade forfeits a dropped player's match once it opens", () => {
    const t = seeded("single_elimination", 4);
    const bracket = phaseId(t, 1);
    const [first, second] = openIn(t, bracket);
    const m1 = required(first, "first match");
    const m2 = required(second, "second match");

    const afterFirst = reportResult(t, { matchId: m1.id, winnerId: player1(m1) }).tournament;
    const dropped = dropParticipant(afterFirst, { participantId: player1(m1) }).tournament;
    const { tournament, events } = reportResult(dropped, {
      matchId: m2.id,
      winnerId: player1(m2),
    });

    const final = required(
      tournament.matches.find((m) => m.id === m1.nextMatchId),
      "final",
    );
    expect(final.status).toBe("complete");
    expect(final.forfeit).toBe(true);
    expect(final.winnerId).toBe(player1(m2));
    expect(events.filter((e) => e.type === "match_reported")).toHaveLength(2);
    expect(events.some((e) => e.type === "match_opened")).toBe(false);
  });

  it("end refuses with unresolved matches unless forced", () => {
    const t = seeded("double_elimination", 4);
    expectCode(() => endTournament(t, { force: false }), "unresolved_matches");
    const done = endTournament(t, { force: true }).tournament;
    expect(done.status).toBe("complete");
    expect(done.phases.every((p) => p.status === "complete")).toBe(true);
  });

  it("two sibling reports into one semifinal both land", () => {
    const t = seeded("single_elimination", 8);
    const bracket = phaseId(t, 1);
    const [first, second] = matchesIn(t, bracket)
      .filter((m) => m.roundNumber === 1)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);
    const m0 = required(first, "m0");
    const m1 = required(second, "m1");

    const a = reportResult(t, { matchId: m0.id, winnerId: player1(m0) }).tournament;
    const { tournament, events } = reportResult(a, { matchId: m1.id, winnerId: player1(m1) });

    const sf = required(
      tournament.matches.find((m) => m.id === m0.nextMatchId),
      "semifinal",
    );
    expect(sf.player1Id).toBe(player1(m0));
    expect(sf.player2Id).toBe(player1(m1));
    expect(sf.status).toBe("open");
    expect(events).toContainEqual({ type: "match_opened", matchId: sf.id });
  });
});
