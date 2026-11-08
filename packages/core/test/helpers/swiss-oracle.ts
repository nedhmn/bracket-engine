import { buildSwissStandings } from "../../src/swiss/standings.ts";
import type { MatchResult, Pairing, Standing } from "../../src/types.ts";

export type SwissOraclePair = [number, number];

export type SwissOracleRound = {
  fide?: SwissOraclePair[];
  pairs: SwissOraclePair[];
  winners: number[];
};

export type SwissOracleEvent = {
  name: string;
  results: "favorites" | "random" | "recorded" | "underdogs";
  rounds: SwissOracleRound[];
  seed?: number;
  source: "challonge" | "fide";
};

export type SwissOracleFixture = {
  events: SwissOracleEvent[];
  players: number;
};

export type SwissPairingMetrics = {
  byeLowest: boolean | null;
  byeScore: number | null;
  floatCount: number;
  floatDistance: number;
  maxFloatDistance: number;
  rematches: number;
  repeatFloats: number;
};

export const seedId = (seed: number): string => `p${seed}`;

const idSeed = (id: string): number => Number(id.slice(1));

export const oraclePairs = (round: SwissOracleRound): SwissOraclePair[] =>
  round.fide ?? round.pairs;

export const eventMatches = (event: SwissOracleEvent, roundCount: number): MatchResult[] =>
  event.rounds.slice(0, roundCount).flatMap((round, index) =>
    round.pairs.map(([a, b], pairIndex) => ({
      player1Id: seedId(a),
      player2Id: b === 0 ? null : seedId(b),
      roundNumber: index + 1,
      winnerId: seedId(round.winners[pairIndex]),
    })),
  );

export const replayStandings = (
  players: number,
  event: SwissOracleEvent,
  roundIndex: number,
): Standing[] =>
  buildSwissStandings(
    Array.from({ length: players }, (_, i) => ({
      participantId: seedId(i + 1),
      dropped: false,
    })),
    eventMatches(event, roundIndex),
  );

export const pairingsToSeeds = (pairings: Pairing[]): SwissOraclePair[] =>
  pairings.map((p) => [idSeed(p.player1), p.player2 === null ? 0 : idSeed(p.player2)]);

const winsBySeed = (standings: Standing[]): Map<number, number> =>
  new Map(standings.map((s) => [idSeed(s.participantId), s.wins]));

const downFloaters = (wins: Map<number, number>, pairs: SwissOraclePair[]): number[] =>
  pairs.flatMap(([a, b]) => {
    if (b === 0) {
      return [];
    }
    const aw = wins.get(a) ?? 0;
    const bw = wins.get(b) ?? 0;
    if (aw === bw) {
      return [];
    }
    return [aw > bw ? a : b];
  });

export const floatHistory = (
  players: number,
  event: SwissOracleEvent,
  roundIndex: number,
): Set<number> => {
  const floated = new Set<number>();
  for (let r = 0; r < roundIndex; r++) {
    const wins = winsBySeed(replayStandings(players, event, r));
    for (const seed of downFloaters(wins, event.rounds[r].pairs)) {
      floated.add(seed);
    }
  }
  return floated;
};

export const pairingMetrics = (
  standings: Standing[],
  pairs: SwissOraclePair[],
  floated: Set<number>,
): SwissPairingMetrics => {
  const wins = winsBySeed(standings);
  const bySeed = new Map(standings.map((s) => [idSeed(s.participantId), s]));
  let floatCount = 0;
  let floatDistance = 0;
  let maxFloatDistance = 0;
  let rematches = 0;
  let byeScore: number | null = null;
  let byeLowest: boolean | null = null;

  for (const [a, b] of pairs) {
    if (b === 0) {
      byeScore = wins.get(a) ?? 0;
      const eligible = standings.filter((s) => !s.dropped && s.byes === 0);
      const lowest = Math.min(...eligible.map((s) => s.wins));
      byeLowest = byeScore === lowest;
      continue;
    }
    const diff = Math.abs((wins.get(a) ?? 0) - (wins.get(b) ?? 0));
    if (diff > 0) {
      floatCount++;
      floatDistance += diff;
      maxFloatDistance = Math.max(maxFloatDistance, diff);
    }
    if (bySeed.get(a)?.opponents.includes(seedId(b))) {
      rematches++;
    }
  }

  const repeatFloats = downFloaters(wins, pairs).filter((seed) => floated.has(seed)).length;

  return {
    byeLowest,
    byeScore,
    floatCount,
    floatDistance,
    maxFloatDistance,
    rematches,
    repeatFloats,
  };
};
