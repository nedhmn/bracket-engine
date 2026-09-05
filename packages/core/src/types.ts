export type BracketSection = "winners" | "losers" | "grand_final";

export type MatchSlot = "player1" | "player2";

export type Seed = number | null;

export type GrandFinalType = "none" | "simple" | "double";

export type LbOrdering = "natural" | "reverse" | "half_shift" | "reverse_half_shift" | "pair_flip";

export type BracketMatchStatus = "pending" | "open" | "bye" | "complete" | "unreachable";

export type BracketMatch = {
  bracketSection: BracketSection | null;
  loserNextMatchNumber: number | null;
  loserNextMatchSlot: MatchSlot | null;
  matchNumber: number;
  nextMatchNumber: number | null;
  nextMatchSlot: MatchSlot | null;
  player1Seed: Seed;
  player2Seed: Seed;
  roundNumber: number;
  status: BracketMatchStatus;
  winnerSeed: Seed;
};

export type DoubleEliminationResult = {
  grandFinal: BracketMatch[];
  losers: BracketMatch[];
  winners: BracketMatch[];
};

export type AdvanceResult = {
  byeMatches: number[];
  newlyOpenMatches: number[];
  updatedMatches: BracketMatch[];
};

export type ReopenResult = {
  byeMatches: number[];
  cascadeInvalidated: number[];
  updatedMatches: BracketMatch[];
};

export type Pairing = {
  player1: string;
  player2: string | null;
};

export type MatchResult = {
  player1Id: string;
  player2Id: string | null;
  roundNumber: number;
  winnerId: string | null;
};

export type ByeWeightFn = (standing: Standing) => number;

export type Standing = {
  byes: number;
  dropped: boolean;
  losses: number;
  opponents: string[];
  participantId: string;
  wins: number;
};

export type MantisRanking = {
  losses: number;
  participantId: string;
  rank: number;
  tb1: number;
  tb2: number;
  tb3: number;
  wins: number;
};
