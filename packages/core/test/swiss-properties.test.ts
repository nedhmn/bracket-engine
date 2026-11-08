import { describe, expect, it } from "vitest";

import { calculateRecommendedRounds, generateSwissRound } from "../src/swiss/pairing.ts";
import { buildSwissStandings } from "../src/swiss/standings.ts";
import type { MatchResult, Pairing, Standing } from "../src/types.ts";

const makeRng = (seed: number) => {
  let s = (seed % 2_147_483_646) + 1;
  return () => {
    s = (s * 48_271) % 2_147_483_647;
    return s / 2_147_483_647;
  };
};

type Cost = [number, number, number, number, number];

const pairingCost = (standings: Standing[], pairings: Pairing[]): Cost => {
  const byId = new Map(standings.map((s) => [s.participantId, s]));
  const lowest = Math.min(...standings.map((s) => s.wins));
  const cost: Cost = [0, 0, 0, 0, 0];
  for (const { player1, player2 } of pairings) {
    const a = byId.get(player1)!;
    if (player2 === null) {
      cost[1] += a.byes;
      cost[2] += a.wins - lowest;
      continue;
    }
    const b = byId.get(player2)!;
    const gap = Math.abs(a.wins - b.wins);
    const floater = a.wins > b.wins ? a : b;
    cost[0] += a.opponents.filter((o) => o === b.participantId).length;
    cost[3] += gap * gap;
    cost[4] += gap > 0 && floater.floats > 0 ? 1 : 0;
  }
  return cost;
};

const compareCost = (a: Cost, b: Cost): number => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }
  return 0;
};

const allPairings = (ids: (string | null)[]): Pairing[][] => {
  if (ids.length === 0) {
    return [[]];
  }
  const [first, ...rest] = ids;
  return rest.flatMap((mate, i) => {
    const remaining = rest.filter((_, j) => j !== i);
    const [player1, player2] = first === null ? [mate!, null] : [first, mate];
    return allPairings(remaining).map((tail) => [{ player1, player2 }, ...tail]);
  });
};

const optimalCost = (standings: Standing[]): Cost => {
  const ids: (string | null)[] = standings.map((s) => s.participantId);
  if (ids.length % 2 === 1) {
    ids.push(null);
  }
  return allPairings(ids)
    .map((pairings) => pairingCost(standings, pairings))
    .reduce((best, cost) => (compareCost(cost, best) < 0 ? cost : best));
};

const playEvent = (
  players: number,
  seed: number,
  onRound: (standings: Standing[], pairings: Pairing[]) => void,
) => {
  const rng = makeRng(seed);
  const participants = Array.from({ length: players }, (_, i) => ({
    participantId: `p${i + 1}`,
    dropped: false,
  }));
  const matches: MatchResult[] = [];
  const rounds = calculateRecommendedRounds(players);
  for (let round = 1; round <= rounds; round++) {
    const standings = buildSwissStandings(participants, matches);
    const pairings = generateSwissRound(standings, round);
    onRound(standings, pairings);
    for (const { player1, player2 } of pairings) {
      matches.push({
        player1Id: player1,
        player2Id: player2,
        roundNumber: round,
        winnerId: player2 === null || rng() < 0.5 ? player1 : player2,
      });
    }
  }
};

describe("swiss pairing properties", () => {
  for (let players = 4; players <= 33; players++) {
    it(`n=${players} seeded events keep every pairing rule`, () => {
      for (let trial = 0; trial < 20; trial++) {
        const byes = new Map<string, number>();
        playEvent(players, players * 1000 + trial, (standings, pairings) => {
          const byId = new Map(standings.map((s) => [s.participantId, s]));
          const seen = pairings.flatMap((p) =>
            p.player2 === null ? [p.player1] : [p.player1, p.player2],
          );
          expect(new Set(seen).size).toBe(players);
          for (const { player1, player2 } of pairings) {
            if (player2 === null) {
              const eligible = standings.filter((s) => s.byes === 0);
              const lowest = Math.min(...eligible.map((s) => s.wins));
              expect(byId.get(player1)!.byes).toBe(0);
              expect(byId.get(player1)!.wins).toBe(lowest);
              byes.set(player1, (byes.get(player1) ?? 0) + 1);
              continue;
            }
            expect(byId.get(player1)!.opponents).not.toContain(player2);
          }
        });
        for (const count of byes.values()) {
          expect(count).toBe(1);
        }
      }
    });
  }

  for (let players = 4; players <= 11; players++) {
    it(`n=${players} finds the best pairing every round`, () => {
      for (let trial = 0; trial < 10; trial++) {
        playEvent(players, players * 7919 + trial, (standings, pairings) => {
          expect(pairingCost(standings, pairings)).toEqual(optimalCost(standings));
        });
      }
    });
  }
});
