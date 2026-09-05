import { generateSeeding, nextPowerOf2 } from "../seeding.ts";
import type {
  BracketMatch,
  DoubleEliminationResult,
  GrandFinalType,
  LbOrdering,
  MatchSlot,
  Seed,
} from "../types.ts";
import { propagateByes } from "./byes.ts";
import { generateGrandFinal } from "./grand-final.ts";
import { applyOrdering, generateLosersBracket, getMinorOrdering } from "./losers-bracket.ts";
import { generateWinnersBracket } from "./winners-bracket.ts";

const wireWbRound1ToLb = (wbRoundMatches: BracketMatch[], lbRound1: BracketMatch[]) => {
  for (let i = 0; i < wbRoundMatches.length; i++) {
    const lbMatchIdx = Math.floor(i / 2);
    if (lbMatchIdx < lbRound1.length) {
      wbRoundMatches[i].loserNextMatchNumber = lbRound1[lbMatchIdx].matchNumber;
      wbRoundMatches[i].loserNextMatchSlot = (i % 2 === 0 ? "player1" : "player2") as MatchSlot;
    }
  }
};

const wireWbRoundToLbMinor = (
  wbRoundMatches: BracketMatch[],
  lbMinorMatches: BracketMatch[],
  ordering?: LbOrdering,
) => {
  const indices = Array.from({ length: wbRoundMatches.length }, (_, i) => i);
  const ordered = ordering ? applyOrdering(indices, ordering) : indices;

  const inverseMap: number[] = Array.from({ length: ordered.length });
  for (let j = 0; j < ordered.length; j++) {
    inverseMap[ordered[j]] = j;
  }

  for (let i = 0; i < wbRoundMatches.length; i++) {
    const lbIdx = inverseMap[i];
    if (lbIdx < lbMinorMatches.length) {
      wbRoundMatches[i].loserNextMatchNumber = lbMinorMatches[lbIdx].matchNumber;
      wbRoundMatches[i].loserNextMatchSlot = "player1" as MatchSlot;
    }
  }
};

export const generateDoubleElimination = (
  participantCount: number,
  grandFinalType: GrandFinalType = "simple",
): DoubleEliminationResult => {
  const seeds = generateSeeding(participantCount);
  const wb = generateWinnersBracket(seeds, 1);

  const wbLosersPerRound: (Seed | null)[][] = [];
  const matchesByRound: BracketMatch[][] = [];

  for (let r = 0; r < wb.roundCount; r++) {
    const roundMatches = wb.matches.filter((m) => m.roundNumber === r + 1);
    matchesByRound.push(roundMatches);
    wbLosersPerRound.push(roundMatches.map(() => null));
  }

  const lbStartMatch = wb.matchCount + 1;
  const lb = generateLosersBracket(wb.roundCount, wbLosersPerRound, lbStartMatch);

  const lbMatchesByRound = new Map<number, BracketMatch[]>();
  for (const m of lb.matches) {
    const arr = lbMatchesByRound.get(m.roundNumber) ?? [];
    arr.push(m);
    lbMatchesByRound.set(m.roundNumber, arr);
  }

  const participantSize = nextPowerOf2(participantCount);
  const roundPairCount = wb.roundCount - 1;

  for (let wbRound = 0; wbRound < wb.roundCount; wbRound++) {
    const wbRoundMatches = matchesByRound[wbRound];
    if (wbRound === 0) {
      wireWbRound1ToLb(wbRoundMatches, lbMatchesByRound.get(1) ?? []);
    } else {
      const minorOrdering = getMinorOrdering(participantSize, wbRound - 1, roundPairCount);
      wireWbRoundToLbMinor(wbRoundMatches, lbMatchesByRound.get(wbRound * 2) ?? [], minorOrdering);
    }
  }

  const gfStartMatch = lbStartMatch + lb.matchCount;
  const wbFinal = wb.matches.at(-1);
  const lbFinal = lb.matches.at(-1);

  const gf = wbFinal ? generateGrandFinal(grandFinalType, gfStartMatch) : [];

  if (gf.length > 0 && wbFinal) {
    wbFinal.nextMatchNumber = gf[0].matchNumber;
    wbFinal.nextMatchSlot = "player1";
    if (lbFinal) {
      lbFinal.nextMatchNumber = gf[0].matchNumber;
      lbFinal.nextMatchSlot = "player2";
    } else {
      wbFinal.loserNextMatchNumber = gf[0].matchNumber;
      wbFinal.loserNextMatchSlot = "player2";
    }
  }

  const allMatches = [...wb.matches, ...lb.matches, ...gf];
  const propagated = propagateByes(allMatches);

  return {
    winners: propagated.filter((m) => m.bracketSection === "winners"),
    losers: propagated.filter((m) => m.bracketSection === "losers"),
    grandFinal: propagated.filter((m) => m.bracketSection === "grand_final"),
  };
};
