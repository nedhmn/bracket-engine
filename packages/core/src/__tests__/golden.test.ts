import { describe, expect, it } from "vitest";

import { advanceWinner } from "../brackets/advance.ts";
import { generateDoubleElimination } from "../brackets/double-elimination.ts";
import { generateSingleElimination } from "../brackets/single-elimination.ts";
import { calculateMantisRankings } from "../swiss/standings.ts";
import type { BracketMatch } from "../types.ts";
import fixtures from "./fixtures.json" with { type: "json" };

type SEFixture = (typeof fixtures)["se_4"];
type DEFixture = (typeof fixtures)["de_4"];

const seFixture = (n: number): SEFixture =>
  fixtures[`se_${n}` as keyof typeof fixtures] as SEFixture;

const deFixture = (n: number): DEFixture =>
  fixtures[`de_${n}` as keyof typeof fixtures] as DEFixture;

describe("golden: single elimination structure", () => {
  it.each([4, 8, 16])("SE %i: correct match count and round count", (n) => {
    const expected = seFixture(n);
    const matches = generateSingleElimination(n);

    expect(matches.length).toBe(expected.totalMatches);

    const maxRound = Math.max(...matches.map((m) => m.roundNumber));
    expect(maxRound).toBe(expected.roundCount);
  });

  it.each([4, 8, 16])("SE %i: round 1 seeding matches reference", (n) => {
    const expected = seFixture(n);
    const matches = generateSingleElimination(n);

    const r1 = matches
      .filter((m) => m.roundNumber === 1)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);
    const expectedR1 = expected.matches
      .filter((m) => m.roundInGroup === 1)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);

    expect(r1.length).toBe(expectedR1.length);

    for (let i = 0; i < r1.length; i++) {
      expect(r1[i].player1Seed).toBe(expectedR1[i].opponent1Position);
      expect(r1[i].player2Seed).toBe(expectedR1[i].opponent2Position);
    }
  });
});

describe("golden: double elimination structure", () => {
  it.each([4, 8, 16])("DE %i: correct section match counts", (n) => {
    const expected = deFixture(n);
    const result = generateDoubleElimination(n);

    expect(result.winners.length).toBe(expected.wbMatches);
    expect(result.losers.length).toBe(expected.lbMatches);
    expect(result.grandFinal.length).toBe(expected.gfMatches);

    const total = result.winners.length + result.losers.length + result.grandFinal.length;
    expect(total).toBe(expected.totalMatches);
  });

  it.each([4, 8, 16])("DE %i: WB round 1 seeding matches reference", (n) => {
    const expected = deFixture(n);
    const result = generateDoubleElimination(n);

    const wbR1 = result.winners
      .filter((m) => m.roundNumber === 1)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);
    const expectedR1 = expected.matches
      .filter((m) => m.section === "winners" && m.roundInSection === 1)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);

    expect(wbR1.length).toBe(expectedR1.length);

    for (let i = 0; i < wbR1.length; i++) {
      expect(wbR1[i].player1Seed).toBe(expectedR1[i].opponent1Position);
      expect(wbR1[i].player2Seed).toBe(expectedR1[i].opponent2Position);
    }
  });

  it("DE 8 double grand final: 2 GF matches", () => {
    const expected = fixtures.de_8_double_gf;
    const result = generateDoubleElimination(8, "double");
    expect(result.grandFinal.length).toBe(expected.gfMatches);
    expect(result.grandFinal.length).toBe(2);
  });
});

describe("golden: LB routing spot-checks", () => {
  it("8-player DE: WB R1 losers feed correct LB R1 matches", () => {
    const result = generateDoubleElimination(8);

    const wbR1 = result.winners
      .filter((m) => m.roundNumber === 1)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);
    const lbR1 = result.losers
      .filter((m) => m.roundNumber === 1)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);

    expect(wbR1.length).toBe(4);
    expect(lbR1.length).toBe(2);

    expect(wbR1[0].loserNextMatchNumber).toBe(lbR1[0].matchNumber);
    expect(wbR1[0].loserNextMatchSlot).toBe("player1");
    expect(wbR1[1].loserNextMatchNumber).toBe(lbR1[0].matchNumber);
    expect(wbR1[1].loserNextMatchSlot).toBe("player2");
    expect(wbR1[2].loserNextMatchNumber).toBe(lbR1[1].matchNumber);
    expect(wbR1[2].loserNextMatchSlot).toBe("player1");
    expect(wbR1[3].loserNextMatchNumber).toBe(lbR1[1].matchNumber);
    expect(wbR1[3].loserNextMatchSlot).toBe("player2");
  });

  it("8-player DE: WB R2 losers routed with reverse ordering", () => {
    const result = generateDoubleElimination(8);

    const wbR2 = result.winners
      .filter((m) => m.roundNumber === 2)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);
    const lbR2 = result.losers
      .filter((m) => m.roundNumber === 2)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);

    expect(wbR2.length).toBe(2);
    expect(lbR2.length).toBe(2);

    expect(wbR2[0].loserNextMatchNumber).toBe(lbR2[1].matchNumber);
    expect(wbR2[0].loserNextMatchSlot).toBe("player1");
    expect(wbR2[1].loserNextMatchNumber).toBe(lbR2[0].matchNumber);
    expect(wbR2[1].loserNextMatchSlot).toBe("player1");
  });

  it("16-player DE: WB R2 losers routed with reverse_half_shift", () => {
    const result = generateDoubleElimination(16);

    const wbR2 = result.winners
      .filter((m) => m.roundNumber === 2)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);
    const lbMinor = result.losers
      .filter((m) => m.roundNumber === 2)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);

    expect(wbR2.length).toBe(4);
    expect(lbMinor.length).toBe(4);

    expect(wbR2[0].loserNextMatchNumber).toBe(lbMinor[1].matchNumber);
    expect(wbR2[1].loserNextMatchNumber).toBe(lbMinor[0].matchNumber);
    expect(wbR2[2].loserNextMatchNumber).toBe(lbMinor[3].matchNumber);
    expect(wbR2[3].loserNextMatchNumber).toBe(lbMinor[2].matchNumber);
  });

  it("16-player DE: WB R3 losers routed with reverse ordering", () => {
    const result = generateDoubleElimination(16);

    const wbR3 = result.winners
      .filter((m) => m.roundNumber === 3)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);
    const lbR4 = result.losers
      .filter((m) => m.roundNumber === 4)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);

    expect(wbR3.length).toBe(2);
    expect(lbR4.length).toBe(2);

    expect(wbR3[0].loserNextMatchNumber).toBe(lbR4[1].matchNumber);
    expect(wbR3[1].loserNextMatchNumber).toBe(lbR4[0].matchNumber);
  });
});

describe("golden: end-to-end DE walkthrough", () => {
  it("8-player DE: play through entire bracket, verify final state", () => {
    const result = generateDoubleElimination(8);
    let allMatches: BracketMatch[] = [...result.winners, ...result.losers, ...result.grandFinal];

    const playMatch = (matchNumber: number, winnerSeed: number) => {
      const { updatedMatches } = advanceWinner(allMatches, matchNumber, winnerSeed);
      allMatches = updatedMatches;
    };

    const findMatch = (section: string, round: number, idx: number) => {
      const matches = allMatches
        .filter((m) => m.bracketSection === section && m.roundNumber === round)
        .toSorted((a, b) => a.matchNumber - b.matchNumber);
      return matches[idx];
    };

    const wbR1 = allMatches
      .filter(
        (m) =>
          m.bracketSection === "winners" &&
          m.roundNumber === 1 &&
          m.player1Seed !== null &&
          m.player2Seed !== null,
      )
      .toSorted((a, b) => a.matchNumber - b.matchNumber);
    expect(wbR1.length).toBe(4);
    expect(wbR1[0].player1Seed).toBe(1);
    expect(wbR1[0].player2Seed).toBe(8);

    playMatch(wbR1[0].matchNumber, 1);
    playMatch(wbR1[1].matchNumber, 4);
    playMatch(wbR1[2].matchNumber, 2);
    playMatch(wbR1[3].matchNumber, 3);

    const wbR2m0 = findMatch("winners", 2, 0);
    const wbR2m1 = findMatch("winners", 2, 1);
    expect(wbR2m0.player1Seed).toBe(1);
    expect(wbR2m0.player2Seed).toBe(4);
    expect(wbR2m1.player1Seed).toBe(2);
    expect(wbR2m1.player2Seed).toBe(3);

    const lbR1m0 = findMatch("losers", 1, 0);
    const lbR1m1 = findMatch("losers", 1, 1);
    expect(lbR1m0.player1Seed).toBe(8);
    expect(lbR1m0.player2Seed).toBe(5);
    expect(lbR1m1.player1Seed).toBe(7);
    expect(lbR1m1.player2Seed).toBe(6);

    playMatch(lbR1m0.matchNumber, 5);
    playMatch(lbR1m1.matchNumber, 6);

    playMatch(wbR2m0.matchNumber, 1);
    playMatch(wbR2m1.matchNumber, 2);

    const lbR2m0 = findMatch("losers", 2, 0);
    const lbR2m1 = findMatch("losers", 2, 1);
    expect(lbR2m0.player1Seed).toBe(3);
    expect(lbR2m0.player2Seed).toBe(5);
    expect(lbR2m1.player1Seed).toBe(4);
    expect(lbR2m1.player2Seed).toBe(6);

    playMatch(lbR2m0.matchNumber, 3);
    playMatch(lbR2m1.matchNumber, 4);

    const lbR3 = findMatch("losers", 3, 0);
    expect(lbR3.player1Seed).toBe(3);
    expect(lbR3.player2Seed).toBe(4);

    playMatch(lbR3.matchNumber, 3);

    playMatch(findMatch("winners", 3, 0).matchNumber, 1);

    const lbR4 = findMatch("losers", 4, 0);
    expect(lbR4.player1Seed).toBe(2);
    expect(lbR4.player2Seed).toBe(3);

    playMatch(lbR4.matchNumber, 2);

    const gf = findMatch("grand_final", 1, 0);
    expect(gf.player1Seed).toBe(1);
    expect(gf.player2Seed).toBe(2);
  });

  it("16-player DE: verify LB receives correctly ordered losers", () => {
    const result = generateDoubleElimination(16);
    let allMatches: BracketMatch[] = [...result.winners, ...result.losers, ...result.grandFinal];

    const playMatch = (matchNumber: number, winnerSeed: number) => {
      const { updatedMatches } = advanceWinner(allMatches, matchNumber, winnerSeed);
      allMatches = updatedMatches;
    };

    const wbR1 = allMatches
      .filter(
        (m) =>
          m.bracketSection === "winners" &&
          m.roundNumber === 1 &&
          m.player1Seed !== null &&
          m.player2Seed !== null,
      )
      .toSorted((a, b) => a.matchNumber - b.matchNumber);

    for (const m of wbR1) {
      const winner = Math.min(m.player1Seed!, m.player2Seed!);
      playMatch(m.matchNumber, winner);
    }

    const lbR1 = allMatches
      .filter((m) => m.bracketSection === "losers" && m.roundNumber === 1)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);
    expect(lbR1.map((m) => [m.player1Seed, m.player2Seed])).toEqual([
      [16, 9],
      [13, 12],
      [15, 10],
      [14, 11],
    ]);

    for (const m of lbR1) {
      playMatch(m.matchNumber, Math.min(m.player1Seed!, m.player2Seed!));
    }

    const wbR2 = allMatches
      .filter((m) => m.bracketSection === "winners" && m.roundNumber === 2)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);
    for (const m of wbR2) {
      playMatch(m.matchNumber, Math.min(m.player1Seed!, m.player2Seed!));
    }

    const lbR2 = allMatches
      .filter((m) => m.bracketSection === "losers" && m.roundNumber === 2)
      .toSorted((a, b) => a.matchNumber - b.matchNumber);

    expect(lbR2.map((m) => m.player1Seed)).toEqual([5, 8, 6, 7]);
  });
});

describe("golden: cross-validate Mantis with packages/api", () => {
  it("mantis rankings: identical algorithm to packages/api/utils.ts", () => {
    const participants = ["a", "b", "c", "d"];
    const matches = [
      { winnerId: "a", player1Id: "a", player2Id: "b", roundNumber: 1 },
      { winnerId: "c", player1Id: "c", player2Id: "d", roundNumber: 1 },
      { winnerId: "a", player1Id: "a", player2Id: "c", roundNumber: 2 },
      { winnerId: "b", player1Id: "b", player2Id: "d", roundNumber: 2 },
      { winnerId: "a", player1Id: "a", player2Id: "d", roundNumber: 3 },
      { winnerId: "c", player1Id: "c", player2Id: "b", roundNumber: 3 },
    ];

    const rankings = calculateMantisRankings(participants, matches);

    expect(rankings[0].participantId).toBe("a");
    expect(rankings[0].wins).toBe(3);
    expect(rankings[0].losses).toBe(0);

    for (const r of rankings) {
      let expectedTb1 = 0;
      for (const m of matches) {
        let oppId: string | null = null;
        if (m.player1Id === r.participantId) {
          oppId = m.player2Id;
        }
        if (m.player2Id === r.participantId) {
          oppId = m.player1Id;
        }
        if (!oppId) {
          continue;
        }

        const opp = rankings.find((rr) => rr.participantId === oppId)!;
        expectedTb1 += Math.max(opp.wins - opp.losses, -3);
      }
      expect(r.tb1).toBe(expectedTb1);
    }

    for (const r of rankings) {
      let expectedTb2 = 0;
      for (const m of matches) {
        let oppId: string | null = null;
        if (m.player1Id === r.participantId) {
          oppId = m.player2Id;
        }
        if (m.player2Id === r.participantId) {
          oppId = m.player1Id;
        }
        if (!oppId) {
          continue;
        }

        const opp = rankings.find((rr) => rr.participantId === oppId)!;
        expectedTb2 += opp.tb1;
      }
      expect(r.tb2).toBe(expectedTb2);
    }

    for (let i = 0; i < rankings.length - 1; i++) {
      const a = rankings[i];
      const b = rankings[i + 1];
      const cmp = b.wins - a.wins || b.tb1 - a.tb1 || b.tb2 - a.tb2 || b.tb3 - a.tb3;
      expect(cmp).toBeLessThanOrEqual(0);
    }
  });
});
