import { generateSeeding } from "../seeding.ts";
import type { BracketMatch } from "../types.ts";
import { propagateByes } from "./byes.ts";
import { generateWinnersBracket } from "./winners-bracket.ts";

export const generateSingleElimination = (participantCount: number): BracketMatch[] => {
  const seeds = generateSeeding(participantCount);
  const { matches } = generateWinnersBracket(seeds, 1);
  return propagateByes(matches);
};
