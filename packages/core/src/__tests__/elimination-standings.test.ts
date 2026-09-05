import { describe, expect, it } from "vitest";

import { calculateEliminationStandings } from "../elimination-standings.ts";

describe("calculateEliminationStandings", () => {
  it("completed SE keeps champion first", () => {
    const standings = calculateEliminationStandings(
      [
        {
          matchNumber: 1,
          roundNumber: 1,
          bracketSection: "winners",
          player1Id: "A",
          player2Id: "D",
          winnerId: "A",
          status: "complete",
        },
        {
          matchNumber: 2,
          roundNumber: 1,
          bracketSection: "winners",
          player1Id: "B",
          player2Id: "C",
          winnerId: "B",
          status: "complete",
        },
        {
          matchNumber: 3,
          roundNumber: 2,
          bracketSection: "winners",
          player1Id: "A",
          player2Id: "B",
          winnerId: "A",
          status: "complete",
        },
      ],
      [
        { id: "A", seed: 1 },
        { id: "B", seed: 2 },
        { id: "C", seed: 3 },
        { id: "D", seed: 4 },
      ],
    );

    expect(Array.from(standings.entries())).toEqual([
      ["A", { rank: 1, wins: 2, losses: 0 }],
      ["B", { rank: 2, wins: 1, losses: 1 }],
      ["C", { rank: 3, wins: 0, losses: 1 }],
      ["D", { rank: 3, wins: 0, losses: 1 }],
    ]);
  });

  it("premature SE ranks finalists above semifinal losers", () => {
    const standings = calculateEliminationStandings(
      [
        {
          matchNumber: 1,
          roundNumber: 1,
          bracketSection: "winners",
          player1Id: "A",
          player2Id: "D",
          winnerId: "A",
          status: "complete",
        },
        {
          matchNumber: 2,
          roundNumber: 1,
          bracketSection: "winners",
          player1Id: "B",
          player2Id: "C",
          winnerId: "B",
          status: "complete",
        },
        {
          matchNumber: 3,
          roundNumber: 2,
          bracketSection: "winners",
          player1Id: "A",
          player2Id: "B",
          winnerId: null,
          status: "open",
        },
      ],
      [
        { id: "A", seed: 1 },
        { id: "B", seed: 2 },
        { id: "C", seed: 3 },
        { id: "D", seed: 4 },
      ],
    );

    expect(Array.from(standings.entries())).toEqual([
      ["A", { rank: 1, wins: 1, losses: 0 }],
      ["B", { rank: 1, wins: 1, losses: 0 }],
      ["C", { rank: 3, wins: 0, losses: 1 }],
      ["D", { rank: 3, wins: 0, losses: 1 }],
    ]);
  });

  it("completed DE keeps champion first", () => {
    const standings = calculateEliminationStandings(
      [
        {
          matchNumber: 1,
          roundNumber: 1,
          bracketSection: "winners",
          player1Id: "A",
          player2Id: "D",
          winnerId: "A",
          status: "complete",
        },
        {
          matchNumber: 2,
          roundNumber: 1,
          bracketSection: "winners",
          player1Id: "B",
          player2Id: "C",
          winnerId: "B",
          status: "complete",
        },
        {
          matchNumber: 3,
          roundNumber: 2,
          bracketSection: "winners",
          player1Id: "A",
          player2Id: "B",
          winnerId: "A",
          status: "complete",
        },
        {
          matchNumber: 4,
          roundNumber: 1,
          bracketSection: "losers",
          player1Id: "D",
          player2Id: "C",
          winnerId: "C",
          status: "complete",
        },
        {
          matchNumber: 5,
          roundNumber: 2,
          bracketSection: "losers",
          player1Id: "B",
          player2Id: "C",
          winnerId: "B",
          status: "complete",
        },
        {
          matchNumber: 6,
          roundNumber: 1,
          bracketSection: "grand_final",
          player1Id: "A",
          player2Id: "B",
          winnerId: "A",
          status: "complete",
        },
      ],
      [
        { id: "A", seed: 1 },
        { id: "B", seed: 2 },
        { id: "C", seed: 3 },
        { id: "D", seed: 4 },
      ],
    );

    expect(Array.from(standings.entries())).toEqual([
      ["A", { rank: 1, wins: 3, losses: 0 }],
      ["B", { rank: 2, wins: 2, losses: 2 }],
      ["C", { rank: 3, wins: 1, losses: 2 }],
      ["D", { rank: 4, wins: 0, losses: 2 }],
    ]);
  });

  it("premature DE ranks alive players above eliminated players", () => {
    const standings = calculateEliminationStandings(
      [
        {
          matchNumber: 1,
          roundNumber: 1,
          bracketSection: "winners",
          player1Id: "A",
          player2Id: "D",
          winnerId: "A",
          status: "complete",
        },
        {
          matchNumber: 2,
          roundNumber: 1,
          bracketSection: "winners",
          player1Id: "B",
          player2Id: "C",
          winnerId: "B",
          status: "complete",
        },
        {
          matchNumber: 3,
          roundNumber: 2,
          bracketSection: "winners",
          player1Id: "A",
          player2Id: "B",
          winnerId: "A",
          status: "complete",
        },
        {
          matchNumber: 4,
          roundNumber: 1,
          bracketSection: "losers",
          player1Id: "D",
          player2Id: "C",
          winnerId: "C",
          status: "complete",
        },
        {
          matchNumber: 5,
          roundNumber: 2,
          bracketSection: "losers",
          player1Id: "B",
          player2Id: "C",
          winnerId: null,
          status: "open",
        },
        {
          matchNumber: 6,
          roundNumber: 1,
          bracketSection: "grand_final",
          player1Id: "A",
          player2Id: null,
          winnerId: null,
          status: "pending",
        },
      ],
      [
        { id: "A", seed: 1 },
        { id: "B", seed: 2 },
        { id: "C", seed: 3 },
        { id: "D", seed: 4 },
      ],
    );

    expect(Array.from(standings.entries())).toEqual([
      ["A", { rank: 1, wins: 2, losses: 0 }],
      ["B", { rank: 2, wins: 1, losses: 1 }],
      ["C", { rank: 2, wins: 1, losses: 1 }],
      ["D", { rank: 4, wins: 0, losses: 2 }],
    ]);
  });

  it("counts bye matches as wins in records", () => {
    const standings = calculateEliminationStandings(
      [
        {
          matchNumber: 1,
          roundNumber: 1,
          bracketSection: "winners",
          player1Id: "A",
          player2Id: null,
          winnerId: "A",
          status: "bye",
        },
        {
          matchNumber: 2,
          roundNumber: 1,
          bracketSection: "winners",
          player1Id: "B",
          player2Id: "C",
          winnerId: "B",
          status: "complete",
        },
        {
          matchNumber: 3,
          roundNumber: 2,
          bracketSection: "winners",
          player1Id: "A",
          player2Id: "B",
          winnerId: "A",
          status: "complete",
        },
      ],
      [
        { id: "A", seed: 1 },
        { id: "B", seed: 2 },
        { id: "C", seed: 3 },
      ],
    );

    expect(Array.from(standings.entries())).toEqual([
      ["A", { rank: 1, wins: 2, losses: 0 }],
      ["B", { rank: 2, wins: 1, losses: 1 }],
      ["C", { rank: 3, wins: 0, losses: 1 }],
    ]);
  });

  // Sequences match Format Library records (GLCQ25A, PWCQ31)
  it("single-elim n=8: ties same-round exits (1,2,3,3,5,5,5,5)", () => {
    const winners: Parameters<typeof calculateEliminationStandings>[0] = [];
    // R1: 1>8, 4>5, 2>7, 3>6  (matchNumbers 1-4)
    const r1 = [
      ["1", "8"],
      ["4", "5"],
      ["2", "7"],
      ["3", "6"],
    ];
    r1.forEach(([w, l], i) => {
      winners.push({
        matchNumber: i + 1,
        roundNumber: 1,
        bracketSection: "winners",
        player1Id: w,
        player2Id: l,
        winnerId: w,
        status: "complete",
      });
    });
    // R2 (semis): 1>4, 2>3  (matchNumbers 5-6)
    winners.push({
      matchNumber: 5,
      roundNumber: 2,
      bracketSection: "winners",
      player1Id: "1",
      player2Id: "4",
      winnerId: "1",
      status: "complete",
    });
    winners.push({
      matchNumber: 6,
      roundNumber: 2,
      bracketSection: "winners",
      player1Id: "2",
      player2Id: "3",
      winnerId: "2",
      status: "complete",
    });
    // Final: 1>2  (matchNumber 7)
    winners.push({
      matchNumber: 7,
      roundNumber: 3,
      bracketSection: "winners",
      player1Id: "1",
      player2Id: "2",
      winnerId: "1",
      status: "complete",
    });
    const standings = calculateEliminationStandings(
      winners,
      Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1), seed: i + 1 })),
    );
    const rankBySeed = Array.from({ length: 8 }, (_, i) => standings.get(String(i + 1))?.rank);
    // seed 1 champ, seed 2 runner-up, seeds 3&4 tied 3rd, 5-8 tied 5th
    expect(rankBySeed).toEqual([1, 2, 3, 3, 5, 5, 5, 5]);
  });
});
