import { describe, expect, it } from "vitest";

import { advanceWinner } from "../brackets/advance.ts";
import { propagateByes } from "../brackets/byes.ts";
import { generateDoubleElimination } from "../brackets/double-elimination.ts";
import { calculateEliminationStandings } from "../elimination-standings.ts";
import type { BracketMatch, GrandFinalType } from "../types.ts";

const playFavorites = (initial: BracketMatch[]): BracketMatch[] => {
  let current = initial;
  let safety = 500;
  while (safety-- > 0) {
    const open = current.find((m) => m.status === "open");
    if (!open) {
      break;
    }
    current = advanceWinner(
      current,
      open.matchNumber,
      Math.min(open.player1Seed!, open.player2Seed!),
    ).updatedMatches;
  }
  return current;
};

const standingsFor = (matches: BracketMatch[], n: number) => {
  const ids = Array.from({ length: n }, (_, i) => ({
    id: `P${i + 1}`,
    seed: i + 1,
  }));
  return calculateEliminationStandings(
    matches.map((m) => ({
      matchNumber: m.matchNumber,
      roundNumber: m.roundNumber,
      bracketSection: m.bracketSection,
      player1Id: m.player1Seed === null ? null : `P${m.player1Seed}`,
      player2Id: m.player2Seed === null ? null : `P${m.player2Seed}`,
      winnerId: m.winnerSeed === null ? null : `P${m.winnerSeed}`,
      status: m.status,
    })),
    ids,
  );
};

const completeDE = (n: number, gfType: GrandFinalType) => {
  const r = generateDoubleElimination(n, gfType);
  return playFavorites(propagateByes([...r.winners, ...r.losers, ...r.grandFinal]));
};

// "1224" shape: each rank repeats the previous or equals its 1-based position
const assertCompetitionRanking = (ranks: number[], n: number) => {
  expect(ranks).toHaveLength(n);
  const sorted = ranks.toSorted((a, b) => a - b);
  expect(sorted[0]).toBe(1);
  for (let i = 1; i < sorted.length; i++) {
    expect(sorted[i] === sorted[i - 1] || sorted[i] === i + 1).toBe(true);
  }
};

describe("placement: DE champion is always rank 1", () => {
  for (const gfType of ["none", "simple", "double"] as const) {
    for (const n of [4, 5, 8, 9, 16]) {
      it(`n=${n} gf=${gfType}: undefeated seed 1 ranks first`, () => {
        const final = completeDE(n, gfType);
        const standings = standingsFor(final, n);
        expect(standings.get("P1")?.rank).toBe(1);
        assertCompetitionRanking(
          [...standings.values()].map((e) => e.rank),
          n,
        );
      });
    }
  }
});

describe("placement: DE podium ordering", () => {
  it("8-player DE favorites: tied competition ranks (1,2,3,4,5,5,7,7)", () => {
    const final = completeDE(8, "double");
    const standings = standingsFor(final, 8);
    const ranks = [...standings.values()].map((e) => e.rank).toSorted((a, b) => a - b);
    // DE separates 3rd and 4th, then ties the tail
    expect(ranks).toEqual([1, 2, 3, 4, 5, 5, 7, 7]);
  });

  it("4-player DE simple GF: 1st=champ, 2nd=GF loser, 3rd=LB final loser", () => {
    const final = completeDE(4, "simple");
    const standings = standingsFor(final, 4);
    expect(standings.get("P1")?.rank).toBe(1);
    expect(standings.get("P2")?.rank).toBe(2);
    expect(standings.get("P3")?.rank).toBe(3);
    expect(standings.get("P4")?.rank).toBe(4);
  });

  it("4-player DE gf=none: 1st=WB champ, 2nd=LB winner", () => {
    const final = completeDE(4, "none");
    const standings = standingsFor(final, 4);
    expect(standings.get("P1")?.rank).toBe(1);
    expect(standings.get("P2")?.rank).toBe(2);
  });

  it("4-player DE double GF, WB champ wins GF1: champion still rank 1", () => {
    const final = completeDE(4, "double");
    const standings = standingsFor(final, 4);
    expect(standings.get("P1")?.rank).toBe(1);
    expect(standings.get("P2")?.rank).toBe(2);
  });
});
