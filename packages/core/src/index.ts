export { advanceWinner } from "./brackets/advance.ts";
export { propagateByes } from "./brackets/byes.ts";
export { generateDoubleElimination } from "./brackets/double-elimination.ts";
export { generateGrandFinal } from "./brackets/grand-final.ts";
export {
  applyOrdering,
  generateLosersBracket,
  getMinorOrdering,
} from "./brackets/losers-bracket.ts";
export { reopenMatch } from "./brackets/reopen.ts";
export { generateSingleElimination } from "./brackets/single-elimination.ts";
export { generateWinnersBracket } from "./brackets/winners-bracket.ts";
export {
  calculateEliminationStandings,
  type EliminationStandingEntry,
} from "./elimination-standings.ts";
export { generateSeeding, nextPowerOf2 } from "./seeding.ts";
export {
  calculateRecommendedRounds,
  generateSwissRound,
  type SwissRoundOptions,
} from "./swiss/pairing.ts";
export { buildSwissStandings, calculateMantisRankings } from "./swiss/standings.ts";
export type {
  AdvanceResult,
  BracketMatch,
  BracketMatchStatus,
  BracketSection,
  ByeWeightFn,
  DoubleEliminationResult,
  GrandFinalType,
  LbOrdering,
  MantisRanking,
  MatchResult,
  MatchSlot,
  Pairing,
  ReopenResult,
  Seed,
  Standing,
} from "./types.ts";
