import { describe, expect, it } from "vitest";

import { generateSwissRound } from "../swiss/pairing.ts";
import {
  floatHistory,
  oraclePairs,
  pairingMetrics,
  pairingsToSeeds,
  replayStandings,
  type SwissOracleFixture,
} from "../testing/swiss-oracle.ts";
import n05 from "./fixtures/fide-swiss/n05.json" with { type: "json" };
import n06 from "./fixtures/fide-swiss/n06.json" with { type: "json" };
import n07 from "./fixtures/fide-swiss/n07.json" with { type: "json" };
import n08 from "./fixtures/fide-swiss/n08.json" with { type: "json" };
import n09 from "./fixtures/fide-swiss/n09.json" with { type: "json" };
import n10 from "./fixtures/fide-swiss/n10.json" with { type: "json" };
import n11 from "./fixtures/fide-swiss/n11.json" with { type: "json" };
import n12 from "./fixtures/fide-swiss/n12.json" with { type: "json" };
import n13 from "./fixtures/fide-swiss/n13.json" with { type: "json" };
import n14 from "./fixtures/fide-swiss/n14.json" with { type: "json" };
import n15 from "./fixtures/fide-swiss/n15.json" with { type: "json" };
import n16 from "./fixtures/fide-swiss/n16.json" with { type: "json" };
import n17 from "./fixtures/fide-swiss/n17.json" with { type: "json" };
import n24 from "./fixtures/fide-swiss/n24.json" with { type: "json" };
import n32 from "./fixtures/fide-swiss/n32.json" with { type: "json" };
import n33 from "./fixtures/fide-swiss/n33.json" with { type: "json" };
import n48 from "./fixtures/fide-swiss/n48.json" with { type: "json" };
import n64 from "./fixtures/fide-swiss/n64.json" with { type: "json" };

const fixtures = [
  n05,
  n06,
  n07,
  n08,
  n09,
  n10,
  n11,
  n12,
  n13,
  n14,
  n15,
  n16,
  n17,
  n24,
  n32,
  n33,
  n48,
  n64,
] as SwissOracleFixture[];

describe("fide swiss fixtures", () => {
  it("cover every captured size", () => {
    expect(fixtures.map((f) => f.players).toSorted((a, b) => a - b)).toEqual([
      5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 24, 32, 33, 48, 64,
    ]);
  });

  for (const fixture of fixtures) {
    it(`n=${fixture.players} pairs every player once with no rematches`, () => {
      for (const event of fixture.events) {
        for (let r = 0; r < event.rounds.length; r++) {
          const round = event.rounds[r];
          for (const pairs of [round.pairs, oraclePairs(round)]) {
            const seeds = pairs.flat().filter((s) => s !== 0);
            expect(seeds.toSorted((a, b) => a - b)).toEqual(
              Array.from({ length: fixture.players }, (_, i) => i + 1),
            );
          }
          round.winners.forEach((winner, i) => {
            expect(round.pairs[i]).toContain(winner);
          });
          const standings = replayStandings(fixture.players, event, r);
          const metrics = pairingMetrics(
            standings,
            oraclePairs(round),
            floatHistory(fixture.players, event, r),
          );
          expect(metrics.rematches).toBe(0);
          expect(metrics.byeLowest ?? true).toBe(true);
        }
      }
    });
  }

  for (const fixture of fixtures) {
    it(`n=${fixture.players} floats no further and gives byes no higher than fide`, () => {
      const violations: string[] = [];
      for (const event of fixture.events) {
        for (let r = 0; r < event.rounds.length; r++) {
          const standings = replayStandings(fixture.players, event, r);
          const floated = floatHistory(fixture.players, event, r);
          const ours = pairingMetrics(
            standings,
            pairingsToSeeds(generateSwissRound(standings, r + 1)),
            floated,
          );
          const fide = pairingMetrics(standings, oraclePairs(event.rounds[r]), floated);
          const sameReach = ours.maxFloatDistance === fide.maxFloatDistance;
          const broken = [
            ours.rematches > 0 && "rematch",
            ours.byeLowest === false && "bye above lowest group",
            ours.maxFloatDistance > fide.maxFloatDistance && "float reach",
            ours.floatDistance > fide.floatDistance && "float distance",
            sameReach && ours.floatCount > fide.floatCount && "float count",
            sameReach && ours.repeatFloats > fide.repeatFloats && "repeat floats",
          ].filter(Boolean);
          if (broken.length > 0) {
            violations.push(`${event.name} round ${r + 1}: ${broken.join(", ")}`);
          }
        }
      }
      expect(violations).toEqual([]);
    });
  }
});
