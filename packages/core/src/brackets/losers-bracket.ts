import type { BracketMatch, LbOrdering, MatchSlot, Seed } from "../types.ts";

type LosersBracketResult = {
  matchCount: number;
  matches: BracketMatch[];
};

type RoundMatches = { matches: BracketMatch[]; matchNumbers: number[] };

const defaultMinorOrdering = new Map<number, LbOrdering[]>([
  [4, ["natural", "reverse"]],
  [8, ["natural", "reverse", "natural"]],
  [16, ["natural", "reverse_half_shift", "reverse", "natural"]],
  [32, ["natural", "reverse", "half_shift", "natural", "natural"]],
  [64, ["natural", "reverse", "half_shift", "reverse", "natural", "natural"]],
  [128, ["natural", "reverse", "half_shift", "pair_flip", "pair_flip", "pair_flip", "natural"]],
]);

export const applyOrdering = <T>(array: T[], method: LbOrdering): T[] => {
  const half = array.length / 2;
  switch (method) {
    case "natural":
      return [...array];
    case "reverse":
      return array.toReversed();
    case "half_shift":
      return [...array.slice(half), ...array.slice(0, half)];
    case "reverse_half_shift":
      return [...array.slice(0, half).toReversed(), ...array.slice(half).toReversed()];
    case "pair_flip": {
      const result: T[] = [];
      for (let i = 0; i < array.length; i += 2) {
        result.push(array[i + 1], array[i]);
      }
      return result;
    }
    default:
      return [...array];
  }
};

const makePairs = <T>(array: T[]): [T, T][] =>
  array
    .map((_, i) => (i % 2 === 0 ? ([array[i], array[i + 1]] as [T, T]) : undefined))
    .filter((v): v is [T, T] => v !== undefined);

const getMajorOrdering = (participantCount: number): LbOrdering =>
  defaultMinorOrdering.get(participantCount)?.[0] ?? "natural";

export const getMinorOrdering = (
  participantCount: number,
  index: number,
  roundPairCount: number,
): LbOrdering | undefined => {
  if (index === roundPairCount - 1) {
    return;
  }
  return defaultMinorOrdering.get(participantCount)?.[1 + index] ?? "natural";
};

type SlotEntry = {
  seed: Seed;
};

const byeWinnerSlot = (duel: [SlotEntry, SlotEntry]): SlotEntry => {
  if (duel[0].seed === null && duel[1].seed === null) {
    return { seed: null };
  }
  if (duel[0].seed === null) {
    return { seed: duel[1].seed };
  }
  if (duel[1].seed === null) {
    return { seed: duel[0].seed };
  }
  return { seed: null };
};

const transitionToMajor = (prevDuels: [SlotEntry, SlotEntry][]): [SlotEntry, SlotEntry][] => {
  const count = prevDuels.length / 2;
  const result: [SlotEntry, SlotEntry][] = [];
  for (let i = 0; i < count; i++) {
    result.push([byeWinnerSlot(prevDuels[i * 2]), byeWinnerSlot(prevDuels[i * 2 + 1])]);
  }
  return result;
};

const transitionToMinor = (
  prevDuels: [SlotEntry, SlotEntry][],
  losers: SlotEntry[],
  method?: LbOrdering,
): [SlotEntry, SlotEntry][] => {
  const orderedLosers = method ? applyOrdering(losers, method) : losers;
  const result: [SlotEntry, SlotEntry][] = [];
  for (let i = 0; i < prevDuels.length; i++) {
    result.push([orderedLosers[i], byeWinnerSlot(prevDuels[i])]);
  }
  return result;
};

const createRoundMatches = (
  duels: [SlotEntry, SlotEntry][],
  matchCount: number,
  roundNumber: number,
  startMatchNumber: number,
): RoundMatches => {
  const matches: BracketMatch[] = [];
  const matchNumbers: number[] = [];
  let mn = startMatchNumber;
  for (let j = 0; j < matchCount; j++) {
    const p1 = duels[j][0].seed;
    const p2 = duels[j][1].seed;
    matches.push({
      matchNumber: mn,
      roundNumber,
      bracketSection: "losers",
      player1Seed: p1,
      player2Seed: p2,
      nextMatchNumber: null,
      nextMatchSlot: null,
      loserNextMatchNumber: null,
      loserNextMatchSlot: null,
      status: p1 !== null && p2 !== null ? "open" : "pending",
      winnerSeed: null,
    });
    matchNumbers.push(mn);
    mn++;
  }
  return { matches, matchNumbers };
};

const wireRounds = (matches: BracketMatch[], matchNumbersByRound: number[][]) => {
  for (let r = 0; r < matchNumbersByRound.length - 1; r++) {
    const currentRound = matchNumbersByRound[r];
    const nextRound = matchNumbersByRound[r + 1];
    const isMajorToMinor = r % 2 === 0;

    for (let i = 0; i < currentRound.length; i++) {
      const match = matches.find((m) => m.matchNumber === currentRound[i]);
      if (!match) {
        continue;
      }
      if (isMajorToMinor) {
        match.nextMatchNumber = nextRound[i];
        match.nextMatchSlot = "player2" as MatchSlot;
      } else {
        const nextIdx = Math.floor(i / 2);
        match.nextMatchNumber = nextRound[nextIdx];
        match.nextMatchSlot = (i % 2 === 0 ? "player1" : "player2") as MatchSlot;
      }
    }
  }
};

export const generateLosersBracket = (
  wbRoundCount: number,
  wbLosersPerRound: (Seed | null)[][],
  startingMatchNumber: number,
): LosersBracketResult => {
  const participantCount = 2 ** wbRoundCount;
  const roundPairCount = wbRoundCount - 1;
  const matches: BracketMatch[] = [];
  let matchNumber = startingMatchNumber;
  const matchNumbersByRound: number[][] = [];

  let losersIdx = 0;
  const firstLosers = wbLosersPerRound[losersIdx++].map((s) => ({
    seed: s,
  }));
  const majorOrdering = getMajorOrdering(participantCount);
  const ordered = applyOrdering(firstLosers, majorOrdering);
  let duels = makePairs(ordered);

  for (let i = 0; i < roundPairCount; i++) {
    const matchCount = 2 ** (roundPairCount - i - 1);

    if (!(i === 0 && duels.length === matchCount)) {
      duels = transitionToMajor(duels);
    }

    const major = createRoundMatches(duels, matchCount, i * 2 + 1, matchNumber);
    matches.push(...major.matches);
    matchNumbersByRound.push(major.matchNumbers);
    matchNumber += matchCount;

    const losers = wbLosersPerRound[losersIdx++].map((s) => ({ seed: s }));
    const minorOrdering = getMinorOrdering(participantCount, i, roundPairCount);
    duels = transitionToMinor(duels, losers, minorOrdering);

    const minor = createRoundMatches(duels, matchCount, i * 2 + 2, matchNumber);
    matches.push(...minor.matches);
    matchNumbersByRound.push(minor.matchNumbers);
    matchNumber += matchCount;
  }

  wireRounds(matches, matchNumbersByRound);

  return {
    matches,
    matchCount: matches.length,
  };
};
