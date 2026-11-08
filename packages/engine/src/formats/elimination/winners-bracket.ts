import type { BracketMatch, MatchSlot, Seed } from "../types.ts";

type WinnersBracketResult = {
  losersPerRound: (Seed | null)[][];
  matchCount: number;
  matches: BracketMatch[];
  roundCount: number;
};

const linkRounds = (matches: BracketMatch[], matchNumbersByRound: number[][]) => {
  const roundCount = matchNumbersByRound.length;
  for (let round = 0; round < roundCount - 1; round++) {
    const currentRound = matchNumbersByRound[round];
    const nextRound = matchNumbersByRound[round + 1];

    for (let i = 0; i < currentRound.length; i++) {
      const match = matches.find((m) => m.matchNumber === currentRound[i]);
      if (!match) {
        continue;
      }
      const nextMatchIdx = Math.floor(i / 2);
      match.nextMatchNumber = nextRound[nextMatchIdx];
      match.nextMatchSlot = (i % 2 === 0 ? "player1" : "player2") as MatchSlot;
    }
  }
};

export const generateWinnersBracket = (
  seeds: Seed[],
  startingMatchNumber: number,
): WinnersBracketResult => {
  const roundCount = Math.log2(seeds.length);
  const matches: BracketMatch[] = [];
  let matchNumber = startingMatchNumber;
  const losersPerRound: (Seed | null)[][] = [];
  const matchNumbersByRound: number[][] = [];

  for (let round = 0; round < roundCount; round++) {
    const matchCountInRound = 2 ** (roundCount - round - 1);
    const roundMatchNumbers: number[] = [];

    for (let i = 0; i < matchCountInRound; i++) {
      const p1 = round === 0 ? seeds[i * 2] : null;
      const p2 = round === 0 ? seeds[i * 2 + 1] : null;
      matches.push({
        matchNumber,
        roundNumber: round + 1,
        bracketSection: "winners",
        player1Seed: p1,
        player2Seed: p2,
        nextMatchNumber: null,
        nextMatchSlot: null,
        loserNextMatchNumber: null,
        loserNextMatchSlot: null,
        status: p1 !== null && p2 !== null ? "open" : "pending",
        winnerSeed: null,
      });
      roundMatchNumbers.push(matchNumber);
      matchNumber++;
    }

    matchNumbersByRound.push(roundMatchNumbers);
    losersPerRound.push(Array.from({ length: matchCountInRound }, () => null));
  }

  linkRounds(matches, matchNumbersByRound);

  return {
    matches,
    matchCount: matches.length,
    roundCount,
    losersPerRound,
  };
};
