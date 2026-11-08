import type { AdvanceResult, BracketMatch, MatchSlot } from "../types.ts";
import { byeWinner, isTrueBye } from "./byes.ts";

const fillSlot = (
  matches: BracketMatch[],
  matchNumber: number,
  slot: MatchSlot,
  seed: number,
  newlyOpenMatches: number[],
) => {
  const target = matches.find((m) => m.matchNumber === matchNumber);
  if (!target) {
    return;
  }
  const seedKey = slot === "player1" ? "player1Seed" : "player2Seed";
  target[seedKey] = seed;
  if (target.player1Seed !== null && target.player2Seed !== null) {
    target.status = "open";
    newlyOpenMatches.push(target.matchNumber);
  }
};

const propagateByeLoser = (matches: BracketMatch[], match: BracketMatch, queue: number[]) => {
  if (match.loserNextMatchNumber === null || match.loserNextMatchSlot === null) {
    return;
  }
  const loserTarget = matches.find((m) => m.matchNumber === match.loserNextMatchNumber);
  if (!loserTarget) {
    return;
  }
  const key = match.loserNextMatchSlot === "player1" ? "player1Seed" : "player2Seed";
  loserTarget[key] = null;
  queue.push(match.loserNextMatchNumber);
};

const tryResolveByeMatch = (
  matches: BracketMatch[],
  match: BracketMatch,
  newlyOpenMatches: number[],
  byeMatches: number[],
  queue: number[],
) => {
  if (match.status !== "pending" && match.status !== "open") {
    return;
  }
  const winner = byeWinner(match.player1Seed, match.player2Seed);
  if (winner === "normal" || !isTrueBye(matches, match)) {
    return;
  }

  match.status = "bye";
  match.winnerSeed = winner;
  byeMatches.push(match.matchNumber);

  if (match.nextMatchNumber !== null && match.nextMatchSlot !== null && winner !== null) {
    fillSlot(matches, match.nextMatchNumber, match.nextMatchSlot, winner, newlyOpenMatches);
  }
  if (match.nextMatchNumber !== null) {
    queue.push(match.nextMatchNumber);
  }

  propagateByeLoser(matches, match, queue);
};

const resolveByes = (
  matches: BracketMatch[],
  modifiedMatchNumbers: number[],
  newlyOpenMatches: number[],
  byeMatches: number[],
) => {
  const queue = [...modifiedMatchNumbers];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const mn = queue.shift();
    if (mn === undefined || visited.has(mn)) {
      continue;
    }
    visited.add(mn);

    const match = matches.find((m) => m.matchNumber === mn);
    if (!match) {
      continue;
    }

    tryResolveByeMatch(matches, match, newlyOpenMatches, byeMatches, queue);
  }
};

export const advanceWinner = (
  matches: BracketMatch[],
  matchNumber: number,
  winnerSeed: number,
): AdvanceResult => {
  const updatedMatches = matches.map((m) => ({ ...m }));
  const newlyOpenMatches: number[] = [];
  const byeMatches: number[] = [];

  const match = updatedMatches.find((m) => m.matchNumber === matchNumber);
  if (!match) {
    return { updatedMatches, newlyOpenMatches, byeMatches };
  }

  if (match.status !== "open") {
    return { updatedMatches, newlyOpenMatches, byeMatches };
  }

  if (winnerSeed !== match.player1Seed && winnerSeed !== match.player2Seed) {
    return { updatedMatches, newlyOpenMatches, byeMatches };
  }

  match.status = "complete";
  match.winnerSeed = winnerSeed;

  const loserSeed = match.player1Seed === winnerSeed ? match.player2Seed : match.player1Seed;

  // grand_final-scoped: a 2-player DE wires its WB final with next === loserNext too
  const isResetMatch =
    match.bracketSection === "grand_final" &&
    match.nextMatchNumber !== null &&
    match.nextMatchNumber === match.loserNextMatchNumber;
  const skipFill = isResetMatch && winnerSeed === match.player1Seed;

  if (skipFill && match.nextMatchNumber !== null) {
    const gf2 = updatedMatches.find((m) => m.matchNumber === match.nextMatchNumber);
    if (gf2?.status === "pending") {
      gf2.status = "unreachable";
    }
  }

  const modifiedMatchNumbers: number[] = [];

  if (!skipFill && match.nextMatchNumber !== null && match.nextMatchSlot !== null) {
    fillSlot(
      updatedMatches,
      match.nextMatchNumber,
      match.nextMatchSlot,
      winnerSeed,
      newlyOpenMatches,
    );
    modifiedMatchNumbers.push(match.nextMatchNumber);
  }

  if (
    !skipFill &&
    match.loserNextMatchNumber !== null &&
    match.loserNextMatchSlot !== null &&
    loserSeed !== null
  ) {
    fillSlot(
      updatedMatches,
      match.loserNextMatchNumber,
      match.loserNextMatchSlot,
      loserSeed,
      newlyOpenMatches,
    );
    modifiedMatchNumbers.push(match.loserNextMatchNumber);
  }

  resolveByes(updatedMatches, modifiedMatchNumbers, newlyOpenMatches, byeMatches);

  return { updatedMatches, newlyOpenMatches, byeMatches };
};
