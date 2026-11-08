import blossom from "@bracket-engine/blossom";

import type { Pairing, Standing } from "../types.ts";

const NOISE_RANGE = 1000;
const SEED_MULTIPLIER = 6781;

const seededRng = (seed: number) => {
  let s = seed;
  return () => {
    const x = (Math.abs((((s++ * SEED_MULTIPLIER) / Math.PI) % 4) - 2) - 1) * 10_000;
    return x - Math.floor(x);
  };
};

type Weights = {
  bye: number;
  float: number;
  rematch: number;
  repeatBye: number;
  repeatFloat: number;
};

// Each tier outweighs the worst case sum of every tier below it.
const buildWeights = (players: Standing[]): Weights => {
  const pairs = Math.ceil(players.length / 2) + 1;
  const wins = players.map((p) => p.wins);
  const gap = Math.max(...wins) - Math.min(...wins);
  const repeatFloat = pairs * NOISE_RANGE;
  const float = repeatFloat * pairs;
  const bye = float * (pairs * gap * gap + 1);
  const repeatBye = bye * (gap + 1);
  const rematch = repeatBye * (players.length + 1);
  return { bye, float, rematch, repeatBye, repeatFloat };
};

const pairCost = (a: Standing, b: Standing, weights: Weights): number => {
  const gap = Math.abs(a.wins - b.wins);
  const floater = a.wins > b.wins ? a : b;
  const timesPlayed = a.opponents.filter((o) => o === b.participantId).length;
  return (
    weights.rematch * timesPlayed +
    weights.float * gap * gap +
    (gap > 0 && floater.floats > 0 ? weights.repeatFloat : 0)
  );
};

const byeCost = (s: Standing, lowest: number, weights: Weights): number =>
  weights.repeatBye * s.byes + weights.bye * (s.wins - lowest);

const buildEdges = (players: Standing[], rng: () => number): [number, number, number][] => {
  const weights = buildWeights(players);
  const lowest = Math.min(...players.map((p) => p.wins));
  const byeNode = players.length;
  const edges: [number, number, number][] = [];

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const noise = Math.floor(rng() * NOISE_RANGE);
      edges.push([i, j, -(pairCost(players[i], players[j], weights) + noise)]);
    }
    if (players.length % 2 === 1) {
      const noise = Math.floor(rng() * NOISE_RANGE);
      edges.push([i, byeNode, -(byeCost(players[i], lowest, weights) + noise)]);
    }
  }

  return edges;
};

const extractPairings = (players: Standing[], mates: number[]): Pairing[] => {
  const pairings: Pairing[] = [];
  const paired = new Set<number>();
  for (let i = 0; i < players.length; i++) {
    if (paired.has(i)) {
      continue;
    }
    const mate = mates[i];
    paired.add(i);
    paired.add(mate);
    pairings.push({
      player1: players[i].participantId,
      player2: mate === players.length ? null : players[mate].participantId,
    });
  }
  return pairings;
};

export const generateSwissRound = (standings: Standing[], roundNumber: number): Pairing[] => {
  const players = standings.filter((s) => !s.dropped);
  if (players.length === 0) {
    return [];
  }
  const edges = buildEdges(players, seededRng(roundNumber));
  return extractPairings(players, blossom(edges, true));
};

export const calculateRecommendedRounds = (participantCount: number): number =>
  Math.ceil(Math.log2(participantCount));
