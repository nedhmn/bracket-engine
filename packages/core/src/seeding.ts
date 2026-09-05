import type { Seed } from "./types.ts";

export const nextPowerOf2 = (n: number): number => {
  let p = 1;
  while (p < n) {
    p *= 2;
  }
  return p;
};

export const generateSeeding = (participantCount: number): Seed[] => {
  const size = nextPowerOf2(participantCount);

  let positions: number[] = [1, 2];
  while (positions.length < size) {
    const next: number[] = [];
    const len = positions.length * 2;
    for (const pos of positions) {
      next.push(pos, len + 1 - pos);
    }
    positions = next;
  }

  return positions.map((p) => (p > participantCount ? null : p));
};
