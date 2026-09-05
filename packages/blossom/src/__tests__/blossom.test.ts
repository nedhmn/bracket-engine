import { describe, expect, it } from "vitest";

import blossom from "../index.ts";

const assertMatchingInvariant = (edges: [number, number, number][], mate: number[]) => {
  for (let v = 0; v < mate.length; v++) {
    if (mate[v] !== -1) {
      expect(mate[mate[v]]).toBe(v);
    }
  }
  const edgeSet = new Set(edges.map(([i, j]) => `${Math.min(i, j)}-${Math.max(i, j)}`));
  for (let v = 0; v < mate.length; v++) {
    if (mate[v] !== -1 && mate[v] > v) {
      const key = `${v}-${mate[v]}`;
      expect(edgeSet.has(key)).toBe(true);
    }
  }
};

describe("blossom", () => {
  describe("edge cases", () => {
    it("empty input returns empty array", () => {
      expect(blossom([])).toEqual([]);
    });

    it("single edge", () => {
      const mate = blossom([[0, 1, 1]]);
      expect(mate).toEqual([1, 0]);
    });

    it("disconnected vertices left unmatched", () => {
      const mate = blossom([
        [0, 1, 1],
        [2, 3, 1],
      ]);
      expect(mate[0]).toBe(1);
      expect(mate[1]).toBe(0);
      expect(mate[2]).toBe(3);
      expect(mate[3]).toBe(2);
    });
  });

  describe("basic matching", () => {
    it("triangle (3 vertices)", () => {
      const edges: [number, number, number][] = [
        [0, 1, 1],
        [1, 2, 1],
        [0, 2, 1],
      ];
      const mate = blossom(edges);
      const matched = mate.filter((m) => m !== -1).length;
      expect(matched).toBe(2);
      assertMatchingInvariant(edges, mate);
    });

    it("square (4 vertices)", () => {
      const edges: [number, number, number][] = [
        [0, 1, 1],
        [1, 2, 1],
        [2, 3, 1],
        [3, 0, 1],
      ];
      const mate = blossom(edges);
      const matched = mate.filter((m) => m !== -1).length;
      expect(matched).toBe(4);
      assertMatchingInvariant(edges, mate);
    });

    it("complete K4", () => {
      const edges: [number, number, number][] = [
        [0, 1, 1],
        [0, 2, 1],
        [0, 3, 1],
        [1, 2, 1],
        [1, 3, 1],
        [2, 3, 1],
      ];
      const mate = blossom(edges);
      const matched = mate.filter((m) => m !== -1).length;
      expect(matched).toBe(4);
      assertMatchingInvariant(edges, mate);
    });
  });

  describe("weighted matching", () => {
    it("prefers higher weight", () => {
      const mate = blossom([
        [0, 1, 2],
        [1, 2, 10],
        [0, 2, 3],
      ]);
      expect(mate[1]).toBe(2);
      expect(mate[2]).toBe(1);
    });

    it("optimal over greedy", () => {
      const edges: [number, number, number][] = [
        [0, 1, 8],
        [0, 2, 7],
        [1, 2, 1],
        [1, 3, 6],
      ];
      const mate = blossom(edges);
      assertMatchingInvariant(edges, mate);
      const weight = edges.filter(([i, j]) => mate[i] === j).reduce((sum, [, , w]) => sum + w, 0);
      expect(weight).toBe(13);
    });
  });

  describe("negative weights (Swiss-style)", () => {
    it("without maxCardinality, negative weights leave vertices unmatched", () => {
      const edges: [number, number, number][] = [
        [0, 1, -2],
        [1, 2, -3],
        [0, 2, -1],
      ];
      const mate = blossom(edges);
      expect(mate).toEqual([-1, -1, -1]);
    });

    it("with maxCardinality, picks least-negative pair", () => {
      const edges: [number, number, number][] = [
        [0, 1, -2],
        [1, 2, -3],
        [0, 2, -1],
      ];
      const mate = blossom(edges, true);
      expect(mate[0]).toBe(2);
      expect(mate[2]).toBe(0);
    });

    it("negative weights with max cardinality forces pairing", () => {
      const edges: [number, number, number][] = [
        [0, 1, -100],
        [2, 3, -200],
      ];
      const mate = blossom(edges, true);
      expect(mate[0]).toBe(1);
      expect(mate[1]).toBe(0);
      expect(mate[2]).toBe(3);
      expect(mate[3]).toBe(2);
    });
  });

  describe("max cardinality", () => {
    it("forces maximum pairs even at lower total weight", () => {
      const edges: [number, number, number][] = [
        [0, 1, 10],
        [1, 2, 1],
        [2, 3, 1],
      ];
      const mateNormal = blossom(edges);
      const mateMaxCard = blossom(edges, true);
      const matchedNormal = mateNormal.filter((m) => m !== -1).length;
      const matchedMaxCard = mateMaxCard.filter((m) => m !== -1).length;
      expect(matchedMaxCard).toBe(4);
      expect(matchedMaxCard).toBeGreaterThanOrEqual(matchedNormal);
    });
  });

  describe("odd cycles (blossoms)", () => {
    it("pentagon (5-cycle)", () => {
      const edges: [number, number, number][] = [
        [0, 1, 1],
        [1, 2, 1],
        [2, 3, 1],
        [3, 4, 1],
        [4, 0, 1],
      ];
      const mate = blossom(edges, true);
      const matched = mate.filter((m) => m !== -1).length;
      expect(matched).toBe(4);
      assertMatchingInvariant(edges, mate);
    });

    it("nested blossoms", () => {
      const edges: [number, number, number][] = [
        [0, 1, 9],
        [1, 2, 9],
        [2, 3, 9],
        [3, 4, 9],
        [4, 5, 9],
        [5, 0, 9],
        [0, 6, 8],
        [6, 7, 8],
        [7, 2, 8],
      ];
      const mate = blossom(edges, true);
      const matched = mate.filter((m) => m !== -1).length;
      expect(matched).toBeGreaterThanOrEqual(6);
      assertMatchingInvariant(edges, mate);
    });
  });

  describe("result invariants", () => {
    it("mate[mate[v]] === v for all matched vertices", () => {
      const edges: [number, number, number][] = [
        [0, 1, 5],
        [1, 2, 3],
        [2, 3, 7],
        [3, 4, 2],
        [4, 5, 6],
      ];
      const mate = blossom(edges, true);
      assertMatchingInvariant(edges, mate);
    });
  });

  describe("regression (van Rantwijk test cases)", () => {
    it("S-blossom, relabel", () => {
      const mate = blossom(
        [
          [1, 2, 10],
          [2, 3, 11],
        ],
        false,
      );
      expect(mate).toEqual([-1, -1, 3, 2]);
    });

    it("S-blossom, expand, augment", () => {
      const mate = blossom(
        [
          [1, 2, 8],
          [1, 3, 9],
          [2, 3, 10],
          [3, 4, 7],
        ],
        false,
      );
      expect(mate).toEqual([-1, 2, 1, 4, 3]);
    });

    it("S-blossom, expand, augment (variant)", () => {
      const mate = blossom(
        [
          [1, 2, 8],
          [1, 3, 9],
          [2, 3, 10],
          [3, 4, 7],
          [1, 6, 5],
          [4, 5, 6],
        ],
        false,
      );
      expect(mate).toEqual([-1, 6, 3, 2, 5, 4, 1]);
    });

    it("nasty blossom, least-slack S-to-free edge", () => {
      const mate = blossom(
        [
          [1, 2, 45],
          [1, 5, 45],
          [2, 3, 50],
          [3, 4, 45],
          [4, 5, 50],
          [1, 6, 30],
          [3, 9, 35],
          [4, 8, 35],
          [5, 7, 26],
          [9, 10, 5],
        ],
        false,
      );
      expect(mate).toEqual([-1, 6, 3, 2, 8, 7, 1, 5, 4, 10, 9]);
    });

    it("nasty blossom, augmenting with least-slack S-to-free edge", () => {
      const mate = blossom(
        [
          [1, 2, 45],
          [1, 5, 45],
          [2, 3, 50],
          [3, 4, 45],
          [4, 5, 50],
          [1, 6, 30],
          [3, 9, 35],
          [4, 8, 26],
          [5, 7, 40],
          [9, 10, 5],
        ],
        false,
      );
      expect(mate).toEqual([-1, 6, 3, 2, 8, 7, 1, 5, 4, 10, 9]);
    });

    it("nasty blossom, expand T-blossom", () => {
      const mate = blossom(
        [
          [1, 2, 45],
          [1, 5, 45],
          [2, 3, 50],
          [3, 4, 45],
          [4, 5, 50],
          [1, 6, 30],
          [3, 9, 35],
          [4, 8, 28],
          [5, 7, 26],
          [9, 10, 5],
        ],
        false,
      );
      expect(mate).toEqual([-1, 6, 3, 2, 8, 7, 1, 5, 4, 10, 9]);
    });

    it("two blossoms, linked by edge", () => {
      const edges: [number, number, number][] = [
        [0, 1, 10],
        [1, 2, 10],
        [0, 2, 10],
        [3, 4, 10],
        [4, 5, 10],
        [3, 5, 10],
        [0, 3, 1],
      ];
      const mate = blossom(edges);
      const matched = mate.filter((m) => m !== -1).length;
      expect(matched).toBe(6);
      assertMatchingInvariant(edges, mate);
    });
  });
});
