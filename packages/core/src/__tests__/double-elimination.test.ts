import { describe, expect, it } from "vitest";

import { generateDoubleElimination } from "../brackets/double-elimination.ts";

describe("generateDoubleElimination", () => {
  describe("match counts", () => {
    it("4 players: 3 WB + 2 LB + 1 GF = 6 matches", () => {
      const result = generateDoubleElimination(4);
      expect(result.winners).toHaveLength(3);
      expect(result.losers).toHaveLength(2);
      expect(result.grandFinal).toHaveLength(1);
    });

    it("8 players: 7 WB + 6 LB + 1 GF = 14 matches", () => {
      const result = generateDoubleElimination(8);
      expect(result.winners).toHaveLength(7);
      expect(result.losers).toHaveLength(6);
      expect(result.grandFinal).toHaveLength(1);
    });

    it("16 players: 15 WB + 14 LB + 1 GF = 30 matches", () => {
      const result = generateDoubleElimination(16);
      expect(result.winners).toHaveLength(15);
      expect(result.losers).toHaveLength(14);
      expect(result.grandFinal).toHaveLength(1);
    });
  });

  describe("losers bracket structure", () => {
    it("LB round count = (WB_rounds - 1) * 2 for 8 players", () => {
      const result = generateDoubleElimination(8);
      const lbRounds = new Set(result.losers.map((m) => m.roundNumber));
      expect(lbRounds.size).toBe(4);
    });

    it("LB round count = (WB_rounds - 1) * 2 for 16 players", () => {
      const result = generateDoubleElimination(16);
      const lbRounds = new Set(result.losers.map((m) => m.roundNumber));
      expect(lbRounds.size).toBe(6);
    });

    it("all LB matches have bracketSection = losers", () => {
      const result = generateDoubleElimination(8);
      for (const match of result.losers) {
        expect(match.bracketSection).toBe("losers");
      }
    });
  });

  describe("WB loser routing", () => {
    it("every WB match has loserNextMatchNumber (8 players)", () => {
      const result = generateDoubleElimination(8);
      const allMatchNumbers = new Set(
        [...result.winners, ...result.losers, ...result.grandFinal].map((m) => m.matchNumber),
      );

      for (const match of result.winners) {
        expect(match.loserNextMatchNumber).not.toBeNull();
        expect(allMatchNumbers.has(match.loserNextMatchNumber!)).toBe(true);
      }
    });
  });

  describe("grand final variants", () => {
    it("none: 0 GF matches", () => {
      const result = generateDoubleElimination(8, "none");
      expect(result.grandFinal).toHaveLength(0);
    });

    it("simple: 1 GF match", () => {
      const result = generateDoubleElimination(8, "simple");
      expect(result.grandFinal).toHaveLength(1);
    });

    it("double: 2 GF matches with link", () => {
      const result = generateDoubleElimination(8, "double");
      expect(result.grandFinal).toHaveLength(2);
      expect(result.grandFinal[0].nextMatchNumber).toBe(result.grandFinal[1].matchNumber);
    });
  });

  describe("WB/LB final wiring to GF", () => {
    it("WB final links to GF player1, LB final links to GF player2", () => {
      const result = generateDoubleElimination(8);
      const wbFinal = result.winners.at(-1)!;
      const lbFinal = result.losers.at(-1)!;
      const gf = result.grandFinal[0];

      expect(wbFinal.nextMatchNumber).toBe(gf.matchNumber);
      expect(wbFinal.nextMatchSlot).toBe("player1");
      expect(lbFinal.nextMatchNumber).toBe(gf.matchNumber);
      expect(lbFinal.nextMatchSlot).toBe("player2");
    });
  });

  describe("match number uniqueness", () => {
    it("all match numbers are unique across WB/LB/GF", () => {
      const result = generateDoubleElimination(16);
      const allNumbers = [...result.winners, ...result.losers, ...result.grandFinal].map(
        (m) => m.matchNumber,
      );
      expect(new Set(allNumbers).size).toBe(allNumbers.length);
    });
  });
});
