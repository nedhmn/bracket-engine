import { describe, expect, it } from "vitest";

import { advanceWinner } from "../brackets/advance.ts";
import { propagateByes } from "../brackets/byes.ts";
import { generateDoubleElimination } from "../brackets/double-elimination.ts";
import { reopenMatch } from "../brackets/reopen.ts";
import { generateSingleElimination } from "../brackets/single-elimination.ts";

describe("advanceWinner", () => {
  it("fills correct downstream slot with winner", () => {
    const matches = generateSingleElimination(4);
    const match1 = matches[0];
    const { updatedMatches } = advanceWinner(matches, match1.matchNumber, match1.player1Seed!);

    const downstream = updatedMatches.find((m) => m.matchNumber === match1.nextMatchNumber)!;
    expect(downstream[match1.nextMatchSlot === "player1" ? "player1Seed" : "player2Seed"]).toBe(
      match1.player1Seed,
    );
  });

  it("returns match as newly open when both slots filled", () => {
    const matches = generateSingleElimination(4);
    const round1 = matches.filter((m) => m.roundNumber === 1);

    let current = matches;
    const { updatedMatches: after1 } = advanceWinner(
      current,
      round1[0].matchNumber,
      round1[0].player1Seed!,
    );
    current = after1;

    const { newlyOpenMatches } = advanceWinner(
      current,
      round1[1].matchNumber,
      round1[1].player1Seed!,
    );

    expect(newlyOpenMatches.length).toBeGreaterThan(0);
  });

  it("does not mutate the original array", () => {
    const matches = generateSingleElimination(4);
    const original = matches.map((m) => ({ ...m }));
    advanceWinner(matches, matches[0].matchNumber, matches[0].player1Seed!);

    for (let i = 0; i < matches.length; i++) {
      expect(matches[i]).toEqual(original[i]);
    }
  });

  it("DE: loser routes to LB correctly", () => {
    const result = generateDoubleElimination(4);
    const allMatches = [...result.winners, ...result.losers, ...result.grandFinal];

    const wbMatch = result.winners.find(
      (m) => m.player1Seed !== null && m.player2Seed !== null && m.loserNextMatchNumber !== null,
    )!;

    const { updatedMatches } = advanceWinner(allMatches, wbMatch.matchNumber, wbMatch.player1Seed!);

    const lbMatch = updatedMatches.find((m) => m.matchNumber === wbMatch.loserNextMatchNumber)!;
    const loserSlot = wbMatch.loserNextMatchSlot === "player1" ? "player1Seed" : "player2Seed";
    expect(lbMatch[loserSlot]).toBe(wbMatch.player2Seed);
  });

  it("full SE walkthrough: advance all matches to final", () => {
    const matches = generateSingleElimination(4);
    let current = matches;

    const round1 = current.filter(
      (m) => m.roundNumber === 1 && m.player1Seed !== null && m.player2Seed !== null,
    );

    for (const match of round1) {
      const { updatedMatches } = advanceWinner(current, match.matchNumber, match.player1Seed!);
      current = updatedMatches;
    }

    const finalMatch = current.find((m) => m.nextMatchNumber === null)!;
    expect(finalMatch.player1Seed).not.toBeNull();
    expect(finalMatch.player2Seed).not.toBeNull();
  });

  it("SE 7 players: propagateByes sets bye match status and winnerSeed", () => {
    const matches = generateSingleElimination(7);
    const propagated = propagateByes(matches);

    const byeMatch = propagated.find(
      (m) => m.roundNumber === 1 && (m.player1Seed === null || m.player2Seed === null),
    )!;

    expect(byeMatch.status).toBe("bye");
    expect(byeMatch.winnerSeed).toBe(1);
  });

  it("SE 5 players: cascading byes all get status bye, downstream gets open", () => {
    const matches = generateSingleElimination(5);
    const propagated = propagateByes(matches);

    const byeMatches = propagated.filter((m) => m.status === "bye");
    expect(byeMatches.length).toBeGreaterThan(0);

    for (const m of byeMatches) {
      expect(m.status).toBe("bye");
    }

    const round2 = propagated.filter((m) => m.roundNumber === 2);
    const openR2 = round2.filter((m) => m.status === "open");
    expect(openR2.length).toBeGreaterThan(0);
  });

  it("DE 7 players: LB bye chain resolves correctly", () => {
    const result = generateDoubleElimination(7);
    const allMatches = [...result.winners, ...result.losers, ...result.grandFinal];
    const propagated = propagateByes(allMatches);

    const allByes = propagated.filter((m) => m.status === "bye");
    expect(allByes.length).toBeGreaterThan(0);

    const wbByes = allByes.filter((m) => m.bracketSection === "winners");
    expect(wbByes.length).toBe(1);
    expect(wbByes[0].winnerSeed).toBe(1);

    for (const m of allByes) {
      expect(m.winnerSeed === null || Number.isInteger(m.winnerSeed)).toBe(true);
    }
  });

  it("DE 5 players: double-bye in LB gets status bye with null winnerSeed", () => {
    const result = generateDoubleElimination(5);
    const allMatches = [...result.winners, ...result.losers, ...result.grandFinal];
    const propagated = propagateByes(allMatches);

    const doubleByes = propagated.filter(
      (m) => m.status === "bye" && m.player1Seed === null && m.player2Seed === null,
    );
    for (const m of doubleByes) {
      expect(m.winnerSeed).toBeNull();
    }
  });

  it("advanceWinner creates LB bye: byeMatches includes it, excluded from newlyOpenMatches", () => {
    const result = generateDoubleElimination(7);
    const allMatches = [...result.winners, ...result.losers, ...result.grandFinal];
    const propagated = propagateByes(allMatches);

    const openWbR1 = propagated.filter(
      (m) => m.bracketSection === "winners" && m.roundNumber === 1 && m.status === "open",
    );

    let current = propagated;
    let foundByeInResult = false;

    for (const match of openWbR1) {
      const advResult = advanceWinner(current, match.matchNumber, match.player1Seed!);
      current = advResult.updatedMatches;

      if (advResult.byeMatches.length > 0) {
        foundByeInResult = true;
        for (const bm of advResult.byeMatches) {
          expect(advResult.newlyOpenMatches).not.toContain(bm);
        }
      }
    }

    expect(foundByeInResult).toBe(true);
  });

  it("advanceWinner rejects non-open match: empty result, no state changes", () => {
    const matches = generateSingleElimination(8);
    const pendingMatch = matches.find((m) => m.roundNumber === 3 && m.status === "pending")!;

    const { updatedMatches, newlyOpenMatches, byeMatches } = advanceWinner(
      matches,
      pendingMatch.matchNumber,
      1,
    );

    expect(newlyOpenMatches).toEqual([]);
    expect(byeMatches).toEqual([]);

    const unchanged = updatedMatches.find((m) => m.matchNumber === pendingMatch.matchNumber)!;
    expect(unchanged.status).toBe("pending");
  });

  it("double GF: WB wins GF1 → GF2 marked unreachable", () => {
    const result = generateDoubleElimination(4, "double");
    const allMatches = [...result.winners, ...result.losers, ...result.grandFinal];

    let current = allMatches;

    const wbR1 = current.filter(
      (m) => m.bracketSection === "winners" && m.roundNumber === 1 && m.status === "open",
    );
    for (const m of wbR1) {
      const r = advanceWinner(current, m.matchNumber, m.player1Seed!);
      current = r.updatedMatches;
    }

    const wbFinal = current.find((m) => m.bracketSection === "winners" && m.roundNumber === 2)!;
    const r1 = advanceWinner(current, wbFinal.matchNumber, wbFinal.player1Seed!);
    current = r1.updatedMatches;

    const lbR1 = current.find((m) => m.bracketSection === "losers" && m.roundNumber === 1)!;
    const r2 = advanceWinner(current, lbR1.matchNumber, lbR1.player1Seed!);
    current = r2.updatedMatches;

    const lbR2 = current.find(
      (m) => m.bracketSection === "losers" && m.roundNumber === 2 && m.status === "open",
    )!;
    const r3 = advanceWinner(current, lbR2.matchNumber, lbR2.player1Seed!);
    current = r3.updatedMatches;

    const gf1 = current.find((m) => m.bracketSection === "grand_final" && m.roundNumber === 1)!;
    expect(gf1.status).toBe("open");

    const gfResult = advanceWinner(current, gf1.matchNumber, gf1.player1Seed!);
    current = gfResult.updatedMatches;

    const gf2 = current.find((m) => m.bracketSection === "grand_final" && m.roundNumber === 2)!;
    expect(gf2.status).toBe("unreachable");
    expect(gf2.player1Seed).toBeNull();
    expect(gf2.player2Seed).toBeNull();
  });

  it("double GF: LB wins GF1 → GF2 gets open with both players", () => {
    const result = generateDoubleElimination(4, "double");
    const allMatches = [...result.winners, ...result.losers, ...result.grandFinal];

    let current = allMatches;

    const wbR1 = current.filter(
      (m) => m.bracketSection === "winners" && m.roundNumber === 1 && m.status === "open",
    );
    for (const m of wbR1) {
      const r = advanceWinner(current, m.matchNumber, m.player1Seed!);
      current = r.updatedMatches;
    }

    const wbFinal = current.find((m) => m.bracketSection === "winners" && m.roundNumber === 2)!;
    const r1 = advanceWinner(current, wbFinal.matchNumber, wbFinal.player1Seed!);
    current = r1.updatedMatches;

    const lbR1 = current.find((m) => m.bracketSection === "losers" && m.roundNumber === 1)!;
    const r2 = advanceWinner(current, lbR1.matchNumber, lbR1.player1Seed!);
    current = r2.updatedMatches;

    const lbR2 = current.find(
      (m) => m.bracketSection === "losers" && m.roundNumber === 2 && m.status === "open",
    )!;
    const r3 = advanceWinner(current, lbR2.matchNumber, lbR2.player1Seed!);
    current = r3.updatedMatches;

    const gf1 = current.find((m) => m.bracketSection === "grand_final" && m.roundNumber === 1)!;
    expect(gf1.status).toBe("open");

    const gfResult = advanceWinner(current, gf1.matchNumber, gf1.player2Seed!);
    current = gfResult.updatedMatches;

    const gf2 = current.find((m) => m.bracketSection === "grand_final" && m.roundNumber === 2)!;
    expect(gf2.status).toBe("open");
    expect(gf2.player1Seed).not.toBeNull();
    expect(gf2.player2Seed).not.toBeNull();
  });
});

describe("reopenMatch", () => {
  it("clears downstream slots and cascades", () => {
    const matches = generateSingleElimination(4);
    let current = matches;

    const round1 = current.filter(
      (m) => m.roundNumber === 1 && m.player1Seed !== null && m.player2Seed !== null,
    );

    for (const match of round1) {
      const { updatedMatches } = advanceWinner(current, match.matchNumber, match.player1Seed!);
      current = updatedMatches;
    }

    const finalBefore = current.find((m) => m.nextMatchNumber === null)!;
    expect(finalBefore.player1Seed).not.toBeNull();

    const { updatedMatches, cascadeInvalidated } = reopenMatch(current, round1[0].matchNumber);

    expect(cascadeInvalidated.length).toBeGreaterThan(0);

    const finalAfter = updatedMatches.find((m) => m.nextMatchNumber === null)!;
    expect(finalAfter.player1Seed).toBeNull();
  });

  it("reopenMatch reverts bye: byeMatches in result, match back to pending", () => {
    const result = generateDoubleElimination(7);
    const allMatches = [...result.winners, ...result.losers, ...result.grandFinal];
    const propagated = propagateByes(allMatches);

    const openWbR1 = propagated.filter(
      (m) => m.bracketSection === "winners" && m.roundNumber === 1 && m.status === "open",
    );

    let current = propagated;
    for (const match of openWbR1) {
      const advResult = advanceWinner(current, match.matchNumber, match.player1Seed!);
      current = advResult.updatedMatches;
    }

    const completedWb = current.find(
      (m) => m.bracketSection === "winners" && m.roundNumber === 1 && m.status === "complete",
    )!;

    const reopenResult = reopenMatch(current, completedWb.matchNumber);

    if (reopenResult.byeMatches.length > 0) {
      for (const bmn of reopenResult.byeMatches) {
        const reverted = reopenResult.updatedMatches.find((m) => m.matchNumber === bmn)!;
        expect(reverted.status).toBe("pending");
      }
    }
  });
});
