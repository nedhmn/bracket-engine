import type { BracketMatch, GrandFinalType } from "../types.ts";

export const generateGrandFinal = (
  type: GrandFinalType,
  startingMatchNumber: number,
): BracketMatch[] => {
  if (type === "none") {
    return [];
  }

  const gf1: BracketMatch = {
    matchNumber: startingMatchNumber,
    roundNumber: 1,
    bracketSection: "grand_final",
    player1Seed: null,
    player2Seed: null,
    nextMatchNumber: type === "double" ? startingMatchNumber + 1 : null,
    nextMatchSlot: type === "double" ? "player1" : null,
    loserNextMatchNumber: type === "double" ? startingMatchNumber + 1 : null,
    loserNextMatchSlot: type === "double" ? "player2" : null,
    status: "pending",
    winnerSeed: null,
  };

  if (type === "simple") {
    return [gf1];
  }

  const gf2: BracketMatch = {
    matchNumber: startingMatchNumber + 1,
    roundNumber: 2,
    bracketSection: "grand_final",
    player1Seed: null,
    player2Seed: null,
    nextMatchNumber: null,
    nextMatchSlot: null,
    loserNextMatchNumber: null,
    loserNextMatchSlot: null,
    status: "pending",
    winnerSeed: null,
  };

  return [gf1, gf2];
};
