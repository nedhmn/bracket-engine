import { describe, expect, it } from "vitest";

import { sampleNames, shuffle } from "../src/players.ts";

describe("shuffle", () => {
  it("returns a permutation without touching the input", () => {
    const items = ["a", "b", "c", "d", "e"];
    const out = shuffle(items);
    expect(out.toSorted()).toStrictEqual(items);
    expect(items).toStrictEqual(["a", "b", "c", "d", "e"]);
  });

  it("is driven by the random source", () => {
    expect(shuffle([1, 2, 3, 4], () => 0)).toStrictEqual([2, 3, 4, 1]);
    expect(shuffle([1, 2, 3, 4], () => 0.999)).toStrictEqual([1, 2, 3, 4]);
  });
});

describe("sampleNames", () => {
  it("skips names already taken", () => {
    expect(sampleNames(["Ana", "Cy"], 3)).toStrictEqual(["Ben", "Dee", "Eli"]);
  });

  it("falls back to numbered names past the list", () => {
    const names = sampleNames([], 30);
    expect(new Set(names).size).toBe(30);
    expect(names.at(-1)).toBe("Player 30");
  });
});
