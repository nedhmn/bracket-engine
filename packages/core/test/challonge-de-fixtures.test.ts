import { describe, expect, it } from "vitest";

import n04 from "./fixtures/challonge-de/n04.json" with { type: "json" };
import n05 from "./fixtures/challonge-de/n05.json" with { type: "json" };
import n06 from "./fixtures/challonge-de/n06.json" with { type: "json" };
import n07 from "./fixtures/challonge-de/n07.json" with { type: "json" };
import n08 from "./fixtures/challonge-de/n08.json" with { type: "json" };
import n09 from "./fixtures/challonge-de/n09.json" with { type: "json" };
import n10 from "./fixtures/challonge-de/n10.json" with { type: "json" };
import n11 from "./fixtures/challonge-de/n11.json" with { type: "json" };
import n12 from "./fixtures/challonge-de/n12.json" with { type: "json" };
import n13 from "./fixtures/challonge-de/n13.json" with { type: "json" };
import n14 from "./fixtures/challonge-de/n14.json" with { type: "json" };
import n15 from "./fixtures/challonge-de/n15.json" with { type: "json" };
import n16 from "./fixtures/challonge-de/n16.json" with { type: "json" };
import n17 from "./fixtures/challonge-de/n17.json" with { type: "json" };
import n24 from "./fixtures/challonge-de/n24.json" with { type: "json" };
import n32 from "./fixtures/challonge-de/n32.json" with { type: "json" };
import n33 from "./fixtures/challonge-de/n33.json" with { type: "json" };
import n48 from "./fixtures/challonge-de/n48.json" with { type: "json" };
import n64 from "./fixtures/challonge-de/n64.json" with { type: "json" };
import { canonicalDeWiring, type DeWiring, ourDeWiring } from "./helpers/de-wiring.ts";

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
