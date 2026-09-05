import { describe, expect, it } from "vitest";

import { calculateRecommendedRounds, generateSwissRound } from "../swiss/pairing.ts";
import type { Standing } from "../types.ts";

const makeStandings = (count: number, overrides?: (Partial<Standing> | undefined)[]): Standing[] =>
  Array.from({ length: count }, (_, i) => ({
    participantId: `p${i + 1}`,
    wins: 0,
    losses: 0,
    byes: 0,
    opponents: [],
    dropped: false,
    ...overrides?.[i],
  }));

describe("generateSwissRound", () => {
  it("even count: all players paired, no BYE", () => {
    const standings = makeStandings(8);
    const pairings = generateSwissRound(standings, 1);

    expect(pairings).toHaveLength(4);
    for (const p of pairings) {
      expect(p.player2).not.toBeNull();
    }
  });

  it("odd count: exactly one BYE pairing", () => {
    const standings = makeStandings(7);
    const pairings = generateSwissRound(standings, 1);

    const byePairings = pairings.filter((p) => p.player2 === null);
    expect(byePairings).toHaveLength(1);
    expect(pairings).toHaveLength(4);
  });

  it("all players appear exactly once", () => {
    const standings = makeStandings(8);
    const pairings = generateSwissRound(standings, 1);

    const allPlayers = pairings.flatMap((p) => [p.player1, p.player2].filter(Boolean));
    expect(new Set(allPlayers).size).toBe(8);
  });

  it("no rematches when avoidable", () => {
    const standings: Standing[] = [
      {
        participantId: "p1",
        wins: 1,
        losses: 0,
        byes: 0,
        opponents: ["p2"],
        dropped: false,
      },
      {
        participantId: "p2",
        wins: 0,
        losses: 1,
        byes: 0,
        opponents: ["p1"],
        dropped: false,
      },
      {
        participantId: "p3",
        wins: 1,
        losses: 0,
        byes: 0,
        opponents: ["p4"],
        dropped: false,
      },
      {
        participantId: "p4",
        wins: 0,
        losses: 1,
        byes: 0,
        opponents: ["p3"],
        dropped: false,
      },
    ];

    const pairings = generateSwissRound(standings, 2);

    for (const p of pairings) {
      const s = standings.find((x) => x.participantId === p.player1)!;
      expect(s.opponents).not.toContain(p.player2);
    }
  });

  it("similar records paired preferentially", () => {
    const standings: Standing[] = makeStandings(4, [
      { wins: 2, losses: 0 },
      { wins: 2, losses: 0 },
      { wins: 0, losses: 2 },
      { wins: 0, losses: 2 },
    ]);

    const pairings = generateSwissRound(standings, 3);

    for (const p of pairings) {
      const s1 = standings.find((s) => s.participantId === p.player1)!;
      const s2 = standings.find((s) => s.participantId === p.player2)!;
      expect(s1.wins).toBe(s2.wins);
    }
  });

  it("deterministic for same inputs", () => {
    const standings = makeStandings(8);
    const pairings1 = generateSwissRound(standings, 1);
    const pairings2 = generateSwissRound(standings, 1);
    expect(pairings1).toEqual(pairings2);
  });

  it("dropped players are excluded", () => {
    const standings = makeStandings(6, [{}, {}, {}, {}, { dropped: true }, { dropped: true }]);

    const pairings = generateSwissRound(standings, 1);
    const allPlayers = pairings.flatMap((p) => [p.player1, p.player2].filter(Boolean));
    expect(allPlayers).not.toContain("p5");
    expect(allPlayers).not.toContain("p6");
    expect(pairings).toHaveLength(2);
  });
});

describe("calculateRecommendedRounds", () => {
  it("returns ceil(log2(n))", () => {
    expect(calculateRecommendedRounds(4)).toBe(2);
    expect(calculateRecommendedRounds(8)).toBe(3);
    expect(calculateRecommendedRounds(16)).toBe(4);
    expect(calculateRecommendedRounds(5)).toBe(3);
    expect(calculateRecommendedRounds(6)).toBe(3);
  });
});

describe("repeat-bye avoidance", () => {
  it("a player who already had a bye is not byed again when avoidable", () => {
    for (let trial = 0; trial < 20; trial++) {
      const standings = makeStandings(9, [
        { byes: 1, wins: 1 },
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      ]);
      const pairings = generateSwissRound(standings, trial + 2);
      const byePairing = pairings.find((p) => p.player2 === null);
      expect(byePairing?.player1).not.toBe("p1");
    }
  });

  it("full 4-round 9-player tournaments never repeat a bye", () => {
    const rng = (() => {
      let s = 42;
      return () => {
        s = (s * 48_271) % 2_147_483_647;
        return s / 2_147_483_647;
      };
    })();

    for (let t = 0; t < 25; t++) {
      const ids = Array.from({ length: 9 }, (_, i) => `P${i + 1}`);
      const byes = new Map<string, number>();
      const results: {
        winnerId: string;
        player1Id: string;
        player2Id: string | null;
        roundNumber: number;
      }[] = [];

      for (let round = 1; round <= 4; round++) {
        const standings = ids.map((id) => {
          const s = {
            participantId: id,
            wins: 0,
            losses: 0,
            byes: byes.get(id) ?? 0,
            opponents: [] as string[],
            dropped: false,
          };
          for (const r of results) {
            if (r.player1Id === id) {
              if (r.player2Id !== null) {
                s.opponents.push(r.player2Id);
              }
              if (r.winnerId === id) {
                s.wins++;
              } else {
                s.losses++;
              }
            } else if (r.player2Id === id) {
              s.opponents.push(r.player1Id);
              if (r.winnerId === id) {
                s.wins++;
              } else {
                s.losses++;
              }
            }
          }
          return s;
        });

        const pairings = generateSwissRound(standings, round);
        for (const p of pairings) {
          if (p.player2 === null) {
            byes.set(p.player1, (byes.get(p.player1) ?? 0) + 1);
          }
          const winner = p.player2 === null || rng() < 0.5 ? p.player1 : p.player2;
          results.push({
            winnerId: winner,
            player1Id: p.player1,
            player2Id: p.player2,
            roundNumber: round,
          });
        }
      }

      for (const [, count] of byes) {
        expect(count).toBeLessThanOrEqual(1);
      }
    }
  });
});
