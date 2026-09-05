import blossom from "@bracket-engine/blossom";

import type { ByeWeightFn, Pairing, Standing } from "../types.ts";

const REMATCH_WEIGHT = 1_000_000;
const STANDING_POWER = 2;
const SEED_MULTIPLIER = 6781;

const defaultByeWeight: ByeWeightFn = (s) => -(s.wins - s.losses);

const seededRng = (seed: number) => {
  let s = seed;
  return () => {
    const x = (Math.abs((((s++ * SEED_MULTIPLIER) / Math.PI) % 4) - 2) - 1) * 10_000;
    return x - Math.floor(x);
  };
};

const shuffle = <T>(array: T[], rng: () => number): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

type ParticipantStats = {
  byes: number;
  dropped: boolean;
  id: string;
  losses: number;
  opponents: string[];
  wins: number;
};

const buildStats = (standings: Standing[]): ParticipantStats[] =>
  standings.map((s) => ({
    id: s.participantId,
    wins: s.wins,
    losses: s.losses,
    byes: s.byes,
    opponents: [...s.opponents],
    dropped: s.dropped,
  }));

const buildEdges = (
  shuffled: ParticipantStats[],
  idToIndex: Map<string, number>,
  byeNodeIndex: number | null,
  byeWeightFn: ByeWeightFn,
): [number, number, number][] => {
  const edges: [number, number, number][] = [];

  for (let i = 0; i < shuffled.length; i++) {
    const a = shuffled[i];
    const aIdx = idToIndex.get(a.id) ?? 0;

    for (let j = i + 1; j < shuffled.length; j++) {
      const b = shuffled[j];
      const bIdx = idToIndex.get(b.id) ?? 0;

      const pointDiff = a.wins - a.losses - (b.wins - b.losses);
      const timesPlayed = a.opponents.filter((o) => o === b.id).length;

      const weight = -(pointDiff ** STANDING_POWER + REMATCH_WEIGHT * timesPlayed);
      edges.push([aIdx, bIdx, weight]);
    }

    if (byeNodeIndex !== null) {
      const standing: Standing = {
        participantId: a.id,
        wins: a.wins,
        losses: a.losses,
        byes: a.byes,
        opponents: a.opponents,
        dropped: a.dropped,
      };
      const byeWeight = byeWeightFn(standing) - REMATCH_WEIGHT * a.byes;
      edges.push([aIdx, byeNodeIndex, byeWeight]);
    }
  }

  return edges;
};

const extractPairings = (
  results: number[],
  indexToId: Map<number, string>,
  byeNodeIndex: number | null,
  standings: Standing[],
): Pairing[] => {
  const paired = new Set<number>();
  const pairings: Pairing[] = [];

  const standingOrder = new Map<string, number>();
  for (let i = 0; i < standings.length; i++) {
    standingOrder.set(standings[i].participantId, i);
  }

  const sortedIndices = [...indexToId.keys()]
    .filter((i) => i !== byeNodeIndex)
    .toSorted((a, b) => {
      const aOrder = standingOrder.get(indexToId.get(a) ?? "") ?? Number.POSITIVE_INFINITY;
      const bOrder = standingOrder.get(indexToId.get(b) ?? "") ?? Number.POSITIVE_INFINITY;
      return aOrder - bOrder;
    });

  for (const i of sortedIndices) {
    if (paired.has(i)) {
      continue;
    }
    const partner = results[i];
    if (partner === -1) {
      continue;
    }

    paired.add(i);
    paired.add(partner);

    const id1 = indexToId.get(i) ?? "";
    const id2 = indexToId.get(partner) ?? "";

    if (partner === byeNodeIndex) {
      pairings.push({ player1: id1, player2: null });
    } else {
      pairings.push({ player1: id1, player2: id2 });
    }
  }

  return pairings;
};

export type SwissRoundOptions = {
  // Higher weight is likelier to get the bye. Default: lowest ranked
  byeWeight?: ByeWeightFn;
};

export const generateSwissRound = (
  standings: Standing[],
  roundNumber: number,
  options?: SwissRoundOptions,
): Pairing[] => {
  const byeWeightFn = options?.byeWeight ?? defaultByeWeight;
  const stats = buildStats(standings).filter((s) => !s.dropped);

  const idToIndex = new Map<string, number>();
  const indexToId = new Map<number, string>();
  for (let i = 0; i < stats.length; i++) {
    idToIndex.set(stats[i].id, i);
    indexToId.set(i, stats[i].id);
  }

  let byeNodeIndex: number | null = null;
  if (stats.length % 2 === 1) {
    byeNodeIndex = stats.length;
    indexToId.set(byeNodeIndex, "__BYE__");
  }

  const rng = seededRng(roundNumber);
  const shuffled = shuffle(stats, rng);

  const edges = buildEdges(shuffled, idToIndex, byeNodeIndex, byeWeightFn);
  const results = blossom(edges, true);

  return extractPairings(results, indexToId, byeNodeIndex, standings);
};

export const calculateRecommendedRounds = (participantCount: number): number =>
  Math.ceil(Math.log2(participantCount));
