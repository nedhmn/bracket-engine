import type { BracketMatch, MatchSlot, Seed } from "../types.ts";

const findMatch = (matches: BracketMatch[], matchNumber: number): BracketMatch | undefined =>
  matches.find((m) => m.matchNumber === matchNumber);

const isBye = (seed: Seed): boolean => seed === null;

export const byeWinner = (p1: Seed, p2: Seed): Seed | "normal" => {
  if (isBye(p1) && isBye(p2)) {
    return null;
  }
  if (isBye(p1)) {
    return p2;
  }
  if (isBye(p2)) {
    return p1;
  }
  return "normal";
};

const isResolved = (m: BracketMatch): boolean =>
  m.status === "bye" || m.status === "complete" || m.status === "unreachable";

// A resolved feeder already delivered; a null slot waits only on unresolved feeders
export const isSlotDead = (
  matches: BracketMatch[],
  matchNumber: number,
  slot: MatchSlot,
): boolean => {
  for (const m of matches) {
    if (m.nextMatchNumber === matchNumber && m.nextMatchSlot === slot && !isResolved(m)) {
      return false;
    }
    if (m.loserNextMatchNumber === matchNumber && m.loserNextMatchSlot === slot && !isResolved(m)) {
      return false;
    }
  }
  return true;
};

export const isTrueBye = (matches: BracketMatch[], match: BracketMatch): boolean => {
  if (match.player1Seed !== null && match.player2Seed !== null) {
    return false;
  }
  if (match.player1Seed === null && match.player2Seed === null) {
    return (
      isSlotDead(matches, match.matchNumber, "player1") &&
      isSlotDead(matches, match.matchNumber, "player2")
    );
  }
  const nullSlot: MatchSlot = match.player1Seed === null ? "player1" : "player2";
  return isSlotDead(matches, match.matchNumber, nullSlot);
};

const propagateWinner = (
  result: BracketMatch[],
  matchNumber: number,
  slot: MatchSlot,
  winner: Seed,
): boolean => {
  const next = findMatch(result, matchNumber);
  if (!next) {
    return false;
  }
  const seedKey = slot === "player1" ? "player1Seed" : "player2Seed";
  if (next[seedKey] !== winner) {
    next[seedKey] = winner;
    if (next.player1Seed !== null && next.player2Seed !== null) {
      next.status = "open";
    }
    return true;
  }
  return false;
};

const propagateLoserBye = (
  result: BracketMatch[],
  matchNumber: number,
  slot: MatchSlot,
): boolean => {
  const loserNext = findMatch(result, matchNumber);
  if (!loserNext) {
    return false;
  }
  const seedKey = slot === "player1" ? "player1Seed" : "player2Seed";
  if (loserNext[seedKey] !== null) {
    loserNext[seedKey] = null;
    return true;
  }
  return false;
};

export const propagateByes = (matches: BracketMatch[]): BracketMatch[] => {
  const result = matches.map((m) => ({ ...m }));
  let changed = true;

  while (changed) {
    changed = false;
    for (const match of result) {
      if (isResolved(match)) {
        continue;
      }
      const winner = byeWinner(match.player1Seed, match.player2Seed);
      if (winner === "normal" || !isTrueBye(result, match)) {
        continue;
      }

      match.status = "bye";
      match.winnerSeed = winner;
      changed = true;

      if (match.nextMatchNumber !== null && match.nextMatchSlot !== null && winner !== null) {
        propagateWinner(result, match.nextMatchNumber, match.nextMatchSlot, winner);
      }

      if (match.loserNextMatchNumber !== null && match.loserNextMatchSlot !== null) {
        propagateLoserBye(result, match.loserNextMatchNumber, match.loserNextMatchSlot);
      }
    }
  }

  return result;
};
