import { describe, expect, it } from "vitest";

import { propagateByes } from "../brackets/byes.ts";
import { generateSingleElimination } from "../brackets/single-elimination.ts";
import { generateSeeding, nextPowerOf2 } from "../seeding.ts";

describe("nextPowerOf2", () => {
  it("returns the value itself for powers of 2", () => {
    expect(nextPowerOf2(4)).toBe(4);
    expect(nextPowerOf2(8)).toBe(8);
    expect(nextPowerOf2(16)).toBe(16);
  });

  it("rounds up for non-powers of 2", () => {
    expect(nextPowerOf2(3)).toBe(4);
    expect(nextPowerOf2(5)).toBe(8);
    expect(nextPowerOf2(6)).toBe(8);
    expect(nextPowerOf2(7)).toBe(8);
    expect(nextPowerOf2(9)).toBe(16);
  });
});

describe("generateSeeding", () => {
  it("generates correct inner-outer seeding for 4 players", () => {
    const seeds = generateSeeding(4);
    expect(seeds).toEqual([1, 4, 2, 3]);
  });

  it("generates correct inner-outer seeding for 8 players", () => {
    const seeds = generateSeeding(8);
    expect(seeds).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it("replaces seeds > participantCount with null for 5 players", () => {
    const seeds = generateSeeding(5);
    expect(seeds).toEqual([1, null, 4, 5, 2, null, 3, null]);
  });

  it("replaces seeds > participantCount with null for 6 players", () => {
    const seeds = generateSeeding(6);
    expect(seeds).toEqual([1, null, 4, 5, 2, null, 3, 6]);
  });
});

describe("generateSingleElimination", () => {
  it("generates n-1 matches for power-of-2 sizes", () => {
    expect(generateSingleElimination(4)).toHaveLength(3);
    expect(generateSingleElimination(8)).toHaveLength(7);
    expect(generateSingleElimination(16)).toHaveLength(15);
  });

  it("generates correct round count for 8 players", () => {
    const matches = generateSingleElimination(8);
    const rounds = new Set(matches.map((m) => m.roundNumber));
    expect(rounds.size).toBe(3);
  });

  it("seeds round 1 correctly for 8 players (1v8, 4v5, 2v7, 3v6)", () => {
    const matches = generateSingleElimination(8);
    const round1 = matches
      .filter((m) => m.roundNumber === 1)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);

    expect(round1[0].player1Seed).toBe(1);
    expect(round1[0].player2Seed).toBe(8);
    expect(round1[1].player1Seed).toBe(4);
    expect(round1[1].player2Seed).toBe(5);
    expect(round1[2].player1Seed).toBe(2);
    expect(round1[2].player2Seed).toBe(7);
    expect(round1[3].player1Seed).toBe(3);
    expect(round1[3].player2Seed).toBe(6);
  });

  it("every non-final match has a valid nextMatchNumber", () => {
    const matches = generateSingleElimination(8);
    const maxRound = Math.max(...matches.map((m) => m.roundNumber));
    const allMatchNumbers = new Set(matches.map((m) => m.matchNumber));

    for (const match of matches) {
      if (match.roundNumber < maxRound) {
        expect(match.nextMatchNumber).not.toBeNull();
        expect(allMatchNumbers.has(match.nextMatchNumber!)).toBe(true);
      } else {
        expect(match.nextMatchNumber).toBeNull();
      }
    }
  });

  it("all matches have bracketSection = winners", () => {
    const matches = generateSingleElimination(8);
    for (const match of matches) {
      expect(match.bracketSection).toBe("winners");
    }
  });

  describe("bye propagation for non-power-of-2", () => {
    it("5 players: 3 BYE matches auto-advance, 1 real match", () => {
      const matches = generateSingleElimination(5);
      const round1 = matches.filter((m) => m.roundNumber === 1);
      const realMatches = round1.filter((m) => m.player1Seed !== null && m.player2Seed !== null);
      expect(realMatches).toHaveLength(1);
      expect(realMatches[0].player1Seed).toBe(4);
      expect(realMatches[0].player2Seed).toBe(5);
    });

    it("6 players: seeds auto-advance past BYEs into round 2", () => {
      const matches = generateSingleElimination(6);
      const round2 = matches.filter((m) => m.roundNumber === 2);

      const filledSlots = round2.flatMap((m) =>
        [m.player1Seed, m.player2Seed].filter((s) => s !== null),
      );
      expect(filledSlots).toContain(1);
      expect(filledSlots).toContain(2);
    });

    it("7 players: only 1 BYE match", () => {
      const matches = generateSingleElimination(7);
      const round1 = matches.filter((m) => m.roundNumber === 1);
      const byeMatches = round1.filter((m) => m.player1Seed === null || m.player2Seed === null);
      expect(byeMatches).toHaveLength(1);
    });

    it("7 players: bye does not propagate beyond the immediate next match", () => {
      const matches = generateSingleElimination(7);
      const propagated = propagateByes(matches);
      const final = propagated.find(
        (m) => m.nextMatchNumber === null && m.bracketSection === "winners",
      );

      expect(final).toBeDefined();
      expect(final!.player1Seed).toBeNull();
      expect(final!.player2Seed).toBeNull();
    });

    it("5 players: byes propagate to round 2 but not to the final", () => {
      const matches = generateSingleElimination(5);
      const propagated = propagateByes(matches);
      const final = propagated.find(
        (m) => m.nextMatchNumber === null && m.bracketSection === "winners",
      );
      const round2 = propagated.filter((m) => m.roundNumber === 2);

      expect(final).toBeDefined();
      expect(final!.player1Seed).toBeNull();
      expect(final!.player2Seed).toBeNull();

      const round2FilledSlots = round2.flatMap((m) =>
        [m.player1Seed, m.player2Seed].filter((s) => s !== null),
      );
      expect(round2FilledSlots.length).toBeGreaterThan(0);
    });
  });
});
