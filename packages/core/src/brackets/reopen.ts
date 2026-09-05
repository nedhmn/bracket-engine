import type { BracketMatch, MatchSlot, ReopenResult } from "../types.ts";

const clearSlot = (
  matches: BracketMatch[],
  matchNumber: number,
  slot: MatchSlot,
  cascadeInvalidated: number[],
  byeMatches: number[],
  clearDownstream: (mn: number) => void,
) => {
  const target = matches.find((m) => m.matchNumber === matchNumber);
  if (!target) {
    return;
  }
  // A GF2 marked unreachable has null slots; reopening GF1 must revive it
  if (target.status === "unreachable") {
    target.status = "pending";
    cascadeInvalidated.push(target.matchNumber);
  }
  const seedKey = slot === "player1" ? "player1Seed" : "player2Seed";
  if (target[seedKey] !== null) {
    const wasBye = target.status === "bye";
    target[seedKey] = null;
    target.status = "pending";
    target.winnerSeed = null;
    cascadeInvalidated.push(target.matchNumber);
    if (wasBye) {
      byeMatches.push(target.matchNumber);
    }
    clearDownstream(target.matchNumber);
  }
};

export const reopenMatch = (matches: BracketMatch[], matchNumber: number): ReopenResult => {
  const updatedMatches = matches.map((m) => ({ ...m }));
  const cascadeInvalidated: number[] = [];
  const byeMatches: number[] = [];

  const clearDownstream = (mn: number) => {
    const match = updatedMatches.find((m) => m.matchNumber === mn);
    if (!match) {
      return;
    }

    if (match.nextMatchNumber !== null && match.nextMatchSlot !== null) {
      clearSlot(
        updatedMatches,
        match.nextMatchNumber,
        match.nextMatchSlot,
        cascadeInvalidated,
        byeMatches,
        clearDownstream,
      );
    }

    if (match.loserNextMatchNumber !== null && match.loserNextMatchSlot !== null) {
      clearSlot(
        updatedMatches,
        match.loserNextMatchNumber,
        match.loserNextMatchSlot,
        cascadeInvalidated,
        byeMatches,
        clearDownstream,
      );
    }
  };

  clearDownstream(matchNumber);

  return { updatedMatches, cascadeInvalidated, byeMatches };
};
