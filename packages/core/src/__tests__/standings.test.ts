import { describe, expect, it } from "vitest";

import { buildSwissStandings, calculateMantisRankings } from "../swiss/standings.ts";
import type { MatchResult } from "../types.ts";

describe("buildSwissStandings", () => {
  it("builds wins, losses, opponents, and dropped flags from match results", () => {
    const standings = buildSwissStandings(
      [
        { participantId: "A", dropped: false },
        { participantId: "B", dropped: true },
        { participantId: "C", dropped: false },
      ],
      [
        { winnerId: "A", player1Id: "A", player2Id: "B", roundNumber: 1 },
        { winnerId: "C", player1Id: "C", player2Id: null, roundNumber: 1 },
        { winnerId: "C", player1Id: "A", player2Id: "C", roundNumber: 2 },
      ],
    );

    expect(standings).toEqual([
      {
        participantId: "A",
        wins: 1,
        losses: 1,
        byes: 0,
        opponents: ["B", "C"],
        dropped: false,
      },
      {
        participantId: "B",
        wins: 0,
        losses: 1,
        byes: 0,
        opponents: ["A"],
        dropped: true,
      },
      {
        participantId: "C",
        wins: 2,
        losses: 0,
        byes: 1,
        opponents: ["A"],
        dropped: false,
      },
    ]);
  });
});

describe("calculateMantisRankings", () => {
  const players = ["A", "B", "C", "D", "E", "F", "G", "H"];

  const matches: MatchResult[] = [
    // Round 1
    { winnerId: "A", player1Id: "A", player2Id: "H", roundNumber: 1 },
    { winnerId: "B", player1Id: "B", player2Id: "G", roundNumber: 1 },
    { winnerId: "C", player1Id: "C", player2Id: "F", roundNumber: 1 },
    { winnerId: "D", player1Id: "D", player2Id: "E", roundNumber: 1 },
    // Round 2
    { winnerId: "A", player1Id: "A", player2Id: "B", roundNumber: 2 },
    { winnerId: "C", player1Id: "C", player2Id: "D", roundNumber: 2 },
    { winnerId: "E", player1Id: "E", player2Id: "H", roundNumber: 2 },
    { winnerId: "F", player1Id: "F", player2Id: "G", roundNumber: 2 },
    // Round 3
    { winnerId: "A", player1Id: "A", player2Id: "C", roundNumber: 3 },
    { winnerId: "B", player1Id: "B", player2Id: "E", roundNumber: 3 },
    { winnerId: "D", player1Id: "D", player2Id: "F", roundNumber: 3 },
    { winnerId: "H", player1Id: "G", player2Id: "H", roundNumber: 3 },
  ];

  it("ranks players by wins descending", () => {
    const rankings = calculateMantisRankings(players, matches);
    expect(rankings[0].participantId).toBe("A");
    expect(rankings[0].wins).toBe(3);
    expect(rankings[0].losses).toBe(0);
  });

  it("returns correct win/loss counts", () => {
    const rankings = calculateMantisRankings(players, matches);
    const aRank = rankings.find((r) => r.participantId === "A")!;
    expect(aRank.wins).toBe(3);
    expect(aRank.losses).toBe(0);

    const hRank = rankings.find((r) => r.participantId === "H")!;
    expect(hRank.wins).toBe(1);
    expect(hRank.losses).toBe(2);
  });

  it("TB1 caps opponent contribution at -3", () => {
    const rankings = calculateMantisRankings(
      ["X", "Y", "Z"],
      [
        { winnerId: "X", player1Id: "X", player2Id: "Z", roundNumber: 1 },
        { winnerId: "X", player1Id: "X", player2Id: "Y", roundNumber: 2 },
      ],
    );

    const xRank = rankings.find((r) => r.participantId === "X")!;
    // TB1 = max(-1, -3) + max(-1, -3)
    expect(xRank.tb1).toBe(-2);
  });

  it("TB1 floor at -3 per opponent", () => {
    const rankings = calculateMantisRankings(
      ["X", "Y"],
      [
        { winnerId: "X", player1Id: "X", player2Id: "Y", roundNumber: 1 },
        { winnerId: "X", player1Id: "X", player2Id: "Y", roundNumber: 2 },
        { winnerId: "X", player1Id: "X", player2Id: "Y", roundNumber: 3 },
        { winnerId: "X", player1Id: "X", player2Id: "Y", roundNumber: 4 },
        { winnerId: "X", player1Id: "X", player2Id: "Y", roundNumber: 5 },
      ],
    );

    const xRank = rankings.find((r) => r.participantId === "X")!;
    // five encounters, each max(-5, -3)
    expect(xRank.tb1).toBe(-15);
  });

  it("TB2 = sum of opponents TB1", () => {
    const rankings = calculateMantisRankings(players, matches);
    const aRank = rankings.find((r) => r.participantId === "A")!;

    // A's opponents: H, B, C
    const hTb1 = rankings.find((r) => r.participantId === "H")!.tb1;
    const bTb1 = rankings.find((r) => r.participantId === "B")!.tb1;
    const cTb1 = rankings.find((r) => r.participantId === "C")!.tb1;

    expect(aRank.tb2).toBe(hTb1 + bTb1 + cTb1);
  });

  it("TB3 = sum of lossRound^2", () => {
    const rankings = calculateMantisRankings(
      ["X", "Y"],
      [
        { winnerId: "Y", player1Id: "X", player2Id: "Y", roundNumber: 2 },
        { winnerId: "Y", player1Id: "X", player2Id: "Y", roundNumber: 3 },
      ],
    );

    const xRank = rankings.find((r) => r.participantId === "X")!;
    // X lost in round 2 and 3: 2^2 + 3^2 = 4 + 9 = 13
    expect(xRank.tb3).toBe(13);
  });

  it("sort order: wins DESC → tb1 DESC → tb2 DESC → tb3 DESC", () => {
    const rankings = calculateMantisRankings(players, matches);

    for (let i = 0; i < rankings.length - 1; i++) {
      const a = rankings[i];
      const b = rankings[i + 1];

      if (a.wins !== b.wins) {
        expect(a.wins).toBeGreaterThan(b.wins);
      } else if (a.tb1 !== b.tb1) {
        expect(a.tb1).toBeGreaterThan(b.tb1);
      } else if (a.tb2 === b.tb2) {
        expect(a.tb3).toBeGreaterThanOrEqual(b.tb3);
      } else {
        expect(a.tb2).toBeGreaterThan(b.tb2);
      }
    }
  });

  it("bye counts as a win with no opponent contribution", () => {
    const rankings = calculateMantisRankings(
      ["X", "Y", "Z"],
      [
        { winnerId: "X", player1Id: "X", player2Id: null, roundNumber: 1 },
        { winnerId: "Y", player1Id: "Y", player2Id: "Z", roundNumber: 1 },
      ],
    );

    const xRank = rankings.find((r) => r.participantId === "X")!;
    expect(xRank.wins).toBe(1);
    expect(xRank.losses).toBe(0);
    expect(xRank.tb1).toBe(0);
  });

  it("equal wins: TB1 decides regardless of losses (UDE policy sort)", () => {
    const rankings = calculateMantisRankings(
      ["A", "B", "C", "D", "E"],
      [
        // Round 1: E gets the bye, A beats B, C beats D
        { winnerId: "E", player1Id: "E", player2Id: null, roundNumber: 1 },
        { winnerId: "A", player1Id: "A", player2Id: "B", roundNumber: 1 },
        { winnerId: "C", player1Id: "C", player2Id: "D", roundNumber: 1 },
        // Round 2: E is 1-1 vs the undefeated A, C is 1-0 vs the winless D
        { winnerId: "A", player1Id: "A", player2Id: "E", roundNumber: 2 },
      ],
    );

    const cRank = rankings.find((r) => r.participantId === "C")!;
    const eRank = rankings.find((r) => r.participantId === "E")!;
    expect(cRank.wins).toBe(1);
    expect(cRank.losses).toBe(0);
    expect(eRank.wins).toBe(1);
    expect(eRank.losses).toBe(1);
    // wins tie -> straight to TB1: E played A (2-0, +2), C played D (0-1, -1)
    expect(eRank.tb1).toBeGreaterThan(cRank.tb1);
    expect(eRank.rank).toBeLessThan(cRank.rank);
  });

  it("equal-record ties still resolve by TB1", () => {
    const rankings = calculateMantisRankings(players, matches);

    const sameRecord = rankings.filter((r) => r.wins === 2 && r.losses === 1);
    expect(sameRecord.length).toBeGreaterThan(1);
    for (let i = 0; i < sameRecord.length - 1; i++) {
      expect(sameRecord[i].tb1).toBeGreaterThanOrEqual(sameRecord[i + 1].tb1);
    }
  });

  it("rank numbers are sequential starting at 1", () => {
    const rankings = calculateMantisRankings(players, matches);
    for (let i = 0; i < rankings.length; i++) {
      expect(rankings[i].rank).toBe(i + 1);
    }
  });

  it("handles no matches", () => {
    const rankings = calculateMantisRankings(["A", "B", "C"], []);
    expect(rankings).toHaveLength(3);
    for (const r of rankings) {
      expect(r.wins).toBe(0);
      expect(r.losses).toBe(0);
      expect(r.tb1).toBe(0);
      expect(r.tb2).toBe(0);
      expect(r.tb3).toBe(0);
    }
  });
});

describe("mantis ordering pins (top-cut seeding depends on this)", () => {
  it("equal wins, unequal losses: TB1 decides, not loss count", () => {
    // dropper at 2-0 (played weak field) vs finisher at 2-2 (played strong field)
    const rankings = calculateMantisRankings(
      ["Dropper", "Finisher", "S1", "S2", "W1", "W2"],
      [
        {
          winnerId: "Dropper",
          player1Id: "Dropper",
          player2Id: "W1",
          roundNumber: 1,
        },
        {
          winnerId: "Dropper",
          player1Id: "Dropper",
          player2Id: "W2",
          roundNumber: 2,
        },
        {
          winnerId: "Finisher",
          player1Id: "Finisher",
          player2Id: "S1",
          roundNumber: 1,
        },
        {
          winnerId: "Finisher",
          player1Id: "Finisher",
          player2Id: "S2",
          roundNumber: 2,
        },
        {
          winnerId: "S1",
          player1Id: "S1",
          player2Id: "Finisher",
          roundNumber: 3,
        },
        {
          winnerId: "S2",
          player1Id: "S2",
          player2Id: "Finisher",
          roundNumber: 4,
        },
        // strengthen S1/S2, weaken W1/W2
        { winnerId: "S1", player1Id: "S1", player2Id: "W1", roundNumber: 2 },
        { winnerId: "S2", player1Id: "S2", player2Id: "W2", roundNumber: 1 },
        { winnerId: "S1", player1Id: "S1", player2Id: "W2", roundNumber: 4 },
        { winnerId: "S2", player1Id: "S2", player2Id: "W1", roundNumber: 3 },
      ],
    );

    const dropper = rankings.find((r) => r.participantId === "Dropper")!;
    const finisher = rankings.find((r) => r.participantId === "Finisher")!;
    expect(dropper.wins).toBe(2);
    expect(dropper.losses).toBe(0);
    expect(finisher.wins).toBe(2);
    expect(finisher.losses).toBe(2);
    // finisher's opponents are stronger -> higher TB1 -> ranks above the 2-0 dropper
    expect(finisher.tb1).toBeGreaterThan(dropper.tb1);
    expect(finisher.rank).toBeLessThan(dropper.rank);
  });
});
