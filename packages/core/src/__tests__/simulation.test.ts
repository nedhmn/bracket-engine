import { describe, expect, it } from "vitest";

import { advanceWinner } from "../brackets/advance.ts";
import { propagateByes } from "../brackets/byes.ts";
import { generateDoubleElimination } from "../brackets/double-elimination.ts";
import { reopenMatch } from "../brackets/reopen.ts";
import { generateSingleElimination } from "../brackets/single-elimination.ts";
import type { BracketMatch, GrandFinalType } from "../types.ts";

const makeRng = (seed: number) => {
  let s = (seed % 2_147_483_646) + 1;
  return () => {
    s = (s * 48_271) % 2_147_483_647;
    return s / 2_147_483_647;
  };
};

const generate = (format: "se" | "de", n: number, gfType: GrandFinalType): BracketMatch[] => {
  if (format === "se") {
    return generateSingleElimination(n);
  }
  const r = generateDoubleElimination(n, gfType);
  return propagateByes([...r.winners, ...r.losers, ...r.grandFinal]);
};

const playout = (
  initial: BracketMatch[],
  pickWinner: (m: BracketMatch) => number,
): BracketMatch[] => {
  let current = initial;
  let safety = 2000;
  while (safety-- > 0) {
    const open = current.filter((m) => m.status === "open");
    if (open.length === 0) {
      break;
    }
    const m = open[Math.floor(open.length / 2)];
    current = advanceWinner(current, m.matchNumber, pickWinner(m)).updatedMatches;
  }
  expect(safety).toBeGreaterThan(0);
  return current;
};

const assertMidInvariants = (matches: BracketMatch[]) => {
  const openBySeed = new Map<number, number>();
  for (const m of matches) {
    if (m.status === "open") {
      for (const seed of [m.player1Seed, m.player2Seed]) {
        if (seed !== null) {
          expect(openBySeed.has(seed), `seed ${seed} in two open matches`).toBe(false);
          openBySeed.set(seed, m.matchNumber);
        }
      }
    }
    if (m.player1Seed !== null) {
      expect(m.player1Seed).not.toBe(m.player2Seed);
    }
    if (m.status === "complete") {
      expect([m.player1Seed, m.player2Seed]).toContain(m.winnerSeed);
    }
  }
};

const assertCompleted = (
  matches: BracketMatch[],
  n: number,
  format: "se" | "de",
  gfType: GrandFinalType,
) => {
  const stuck = matches.filter((m) => m.status === "open" || m.status === "pending");
  expect(stuck).toEqual([]);

  if (format === "de" && gfType === "double") {
    const gf = matches.filter((m) => m.bracketSection === "grand_final");
    const wbChampWonGf1 = gf[0]?.status === "complete" && gf[0].winnerSeed === gf[0].player1Seed;
    if (wbChampWonGf1) {
      expect(gf[1]?.status).toBe("unreachable");
    }
  }

  const losses = new Map<number, number>();
  for (const m of matches) {
    if (m.status !== "complete" || m.winnerSeed === null) {
      continue;
    }
    const loser = m.winnerSeed === m.player1Seed ? m.player2Seed : m.player1Seed;
    if (loser !== null) {
      losses.set(loser, (losses.get(loser) ?? 0) + 1);
    }
  }

  let champion: number | null =
    matches.find((m) => m.nextMatchNumber === null && m.status === "complete")?.winnerSeed ?? null;
  if (champion === null && format === "de" && gfType === "double") {
    const gf1 = matches.filter((m) => m.bracketSection === "grand_final")[0];
    if (gf1?.status === "complete" && gf1.winnerSeed === gf1.player1Seed) {
      champion = gf1.winnerSeed;
    }
  }
  expect(champion).not.toBeNull();

  const gfLoser = (() => {
    const gf = matches.filter((m) => m.bracketSection === "grand_final");
    const last = gf.toReversed().find((m) => m.status === "complete");
    if (!last || last.winnerSeed === null) {
      return null;
    }
    return last.winnerSeed === last.player1Seed ? last.player2Seed : last.player1Seed;
  })();

  for (let seed = 1; seed <= n; seed++) {
    const l = losses.get(seed) ?? 0;
    if (format === "se") {
      expect(l, `SE seed ${seed} losses`).toBe(seed === champion ? 0 : 1);
    } else if (seed === champion) {
      expect(l, `DE champion ${seed} losses`).toBeLessThanOrEqual(1);
    } else if (gfType !== "none" && !(seed === gfLoser && gfType === "simple")) {
      expect(l, `DE seed ${seed} losses`).toBe(2);
    }
  }
};

const GF_TYPES: GrandFinalType[] = ["none", "simple", "double"];

describe("simulation: every player count completes with valid invariants", () => {
  for (let n = 2; n <= 64; n++) {
    for (const format of ["se", "de"] as const) {
      for (const gfType of format === "de" ? GF_TYPES : (["none"] as const)) {
        it(`${format.toUpperCase()} n=${n} gf=${gfType}`, () => {
          const initial = generate(format, n, gfType);

          const favorites = playout(initial, (m) => Math.min(m.player1Seed!, m.player2Seed!));
          assertCompleted(favorites, n, format, gfType);

          const upsets = playout(initial, (m) => Math.max(m.player1Seed!, m.player2Seed!));
          assertCompleted(upsets, n, format, gfType);

          const trials = n <= 16 ? 10 : 3;
          for (let t = 0; t < trials; t++) {
            const rng = makeRng(n * 1000 + t);
            let midChecked = 0;
            let current = initial;
            let safety = 2000;
            while (safety-- > 0) {
              const open = current.filter((m) => m.status === "open");
              if (open.length === 0) {
                break;
              }
              const m = open[Math.floor(rng() * open.length)];
              const winner = rng() < 0.5 ? m.player1Seed! : m.player2Seed!;
              current = advanceWinner(current, m.matchNumber, winner).updatedMatches;
              if (midChecked++ < 20) {
                assertMidInvariants(current);
              }
            }
            assertCompleted(current, n, format, gfType);
          }
        });
      }
    }
  }
});

const serialize = (matches: BracketMatch[]): string =>
  matches
    .map((m) => `${m.matchNumber}|${m.player1Seed}|${m.player2Seed}|${m.status}|${m.winnerSeed}`)
    .join(";");

describe("simulation: reopen round-trips restore identical state", () => {
  for (const n of [5, 8, 9, 12, 16, 17]) {
    it(`DE n=${n} random reopen fuzz`, () => {
      for (let t = 0; t < 10; t++) {
        const rng = makeRng(n * 7919 + t);
        let current = generate("de", n, "double");
        const played: number[] = [];

        for (let step = 0; step < 120; step++) {
          const open = current.filter((m) => m.status === "open");
          const doReopen = played.length > 0 && (open.length === 0 || rng() < 0.25);

          if (doReopen) {
            const idx = Math.floor(rng() * played.length);
            const target = played[idx];
            const before = current.find((m) => m.matchNumber === target);
            if (!before || before.status !== "complete") {
              played.splice(idx, 1);
              continue;
            }
            const winnersBefore = new Map<number, number>();
            for (const m of current) {
              if (m.status === "complete" && m.winnerSeed !== null) {
                winnersBefore.set(m.matchNumber, m.winnerSeed);
              }
            }
            const reopenResult = reopenMatch(current, target);
            let replayed = reopenResult.updatedMatches;
            // The caller owns the target-row reset
            const targetMatch = replayed.find((m) => m.matchNumber === target)!;
            targetMatch.status = "open";
            targetMatch.winnerSeed = null;
            const invalidated = new Set(reopenResult.cascadeInvalidated);
            const toReplay = [target, ...[...invalidated].toSorted((a, b) => a - b)];
            for (const mn of toReplay) {
              const w = winnersBefore.get(mn);
              if (w === undefined) {
                continue;
              }
              const m = replayed.find((x) => x.matchNumber === mn);
              if (m?.status === "open") {
                replayed = advanceWinner(replayed, mn, w).updatedMatches;
              }
            }
            expect(serialize(replayed)).toBe(serialize(current));
            current = replayed;
            for (let i = played.length - 1; i >= 0; i--) {
              if (invalidated.has(played[i]) || played[i] === target) {
                played.splice(i, 1);
              }
            }
            played.push(target);
          } else {
            if (open.length === 0) {
              break;
            }
            const m = open[Math.floor(rng() * open.length)];
            const winner = rng() < 0.5 ? m.player1Seed! : m.player2Seed!;
            current = advanceWinner(current, m.matchNumber, winner).updatedMatches;
            played.push(m.matchNumber);
          }
        }
      }
    });
  }
});
