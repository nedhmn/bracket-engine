import { describe, expect, it } from "vitest";

import { canonicalDeWiring, type DeWiring, ourDeWiring } from "./de-wiring.ts";
import n04 from "./fixtures/n04.json" with { type: "json" };
import n05 from "./fixtures/n05.json" with { type: "json" };
import n06 from "./fixtures/n06.json" with { type: "json" };
import n07 from "./fixtures/n07.json" with { type: "json" };
import n08 from "./fixtures/n08.json" with { type: "json" };
import n09 from "./fixtures/n09.json" with { type: "json" };
import n10 from "./fixtures/n10.json" with { type: "json" };
import n11 from "./fixtures/n11.json" with { type: "json" };
import n12 from "./fixtures/n12.json" with { type: "json" };
import n13 from "./fixtures/n13.json" with { type: "json" };
import n14 from "./fixtures/n14.json" with { type: "json" };
import n15 from "./fixtures/n15.json" with { type: "json" };
import n16 from "./fixtures/n16.json" with { type: "json" };
import n17 from "./fixtures/n17.json" with { type: "json" };
import n24 from "./fixtures/n24.json" with { type: "json" };
import n32 from "./fixtures/n32.json" with { type: "json" };
import n33 from "./fixtures/n33.json" with { type: "json" };
import n48 from "./fixtures/n48.json" with { type: "json" };
import n64 from "./fixtures/n64.json" with { type: "json" };

const fixtures = [
  n04,
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
] as DeWiring[];

describe("challonge double elimination fixtures", () => {
  it("cover every captured size", () => {
    expect(fixtures.map((f) => f.players).toSorted((a, b) => a - b)).toEqual([
      4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 24, 32, 33, 48, 64,
    ]);
  });

  for (const challonge of fixtures) {
    it(`n=${challonge.players} wires the losers bracket like challonge`, () => {
      expect(canonicalDeWiring(ourDeWiring(challonge.players))).toBe(canonicalDeWiring(challonge));
    });
  }
});
