import { advanceWinner } from "../formats/elimination/advance.ts";
import { propagateByes } from "../formats/elimination/byes.ts";
import { generateDoubleElimination } from "../formats/elimination/double.ts";
import { reopenMatch } from "../formats/elimination/reopen.ts";
import { generateSingleElimination } from "../formats/elimination/single.ts";
import type { AdvanceResult, BracketMatch, GrandFinalType } from "../formats/types.ts";
import { TournamentError } from "./errors.ts";
import { matchIdFor, phaseMatches, phaseSeeds } from "./state.ts";
import type { EliminationFormat, Match, Tournament, TournamentEvent } from "./types.ts";

type BracketContext = {
  bracket: BracketMatch[];
  participantBySeed: Map<number, string>;
  rowByNumber: Map<number, Match>;
  seedByParticipant: Map<string, number>;
};

function lookup<K, V>(key: K | null, map: Map<K, V>): V | null {
  return key === null ? null : (map.get(key) ?? null);
}

function loadContext(tournament: Tournament, phaseId: string): BracketContext {
  const rows = phaseMatches(tournament, phaseId);
  const seeds = phaseSeeds(tournament, phaseId);
  const seedByParticipant = new Map(seeds.map((s) => [s.participantId, s.seed]));
  const participantBySeed = new Map(seeds.map((s) => [s.seed, s.participantId]));
  const numberById = new Map(rows.map((m) => [m.id, m.matchNumber]));
  const bracket = rows.map((m) => ({
    matchNumber: m.matchNumber,
    roundNumber: m.roundNumber,
    bracketSection: m.bracketSection,
    player1Seed: lookup(m.player1Id, seedByParticipant),
    player2Seed: lookup(m.player2Id, seedByParticipant),
    nextMatchNumber: lookup(m.nextMatchId, numberById),
    nextMatchSlot: m.nextMatchSlot,
    loserNextMatchNumber: lookup(m.loserNextMatchId, numberById),
    loserNextMatchSlot: m.loserNextMatchSlot,
    status: m.status,
    winnerSeed: lookup(m.winnerId, seedByParticipant),
  }));
  return {
    bracket,
    participantBySeed,
    rowByNumber: new Map(rows.map((m) => [m.matchNumber, m])),
    seedByParticipant,
  };
}

function generate(
  format: EliminationFormat,
  count: number,
  grandFinalType: GrandFinalType,
): BracketMatch[] {
  if (format === "single_elimination") {
    return generateSingleElimination(count);
  }
  const { winners, losers, grandFinal } = generateDoubleElimination(count, grandFinalType);
  return [...winners, ...losers, ...grandFinal];
}

export function insertBracket(
  tournament: Tournament,
  phaseId: string,
  format: EliminationFormat,
  grandFinalType: GrandFinalType,
): void {
  const seeds = phaseSeeds(tournament, phaseId);
  const participantBySeed = new Map(seeds.map((s) => [s.seed, s.participantId]));
  const generated = generate(format, seeds.length, grandFinalType);
  const linked = (n: number | null) => (n === null ? null : matchIdFor(phaseId, n));

  for (const m of propagateByes(generated)) {
    tournament.matches.push({
      id: matchIdFor(phaseId, m.matchNumber),
      phaseId,
      matchNumber: m.matchNumber,
      roundNumber: m.roundNumber,
      bracketSection: m.bracketSection,
      player1Id: lookup(m.player1Seed, participantBySeed),
      player2Id: lookup(m.player2Seed, participantBySeed),
      winnerId: lookup(m.winnerSeed, participantBySeed),
      nextMatchId: linked(m.nextMatchNumber),
      nextMatchSlot: m.nextMatchSlot,
      loserNextMatchId: linked(m.loserNextMatchNumber),
      loserNextMatchSlot: m.loserNextMatchSlot,
      status: m.status,
      forfeit: false,
    });
  }
}

function sameSlots(a: BracketMatch | undefined, b: BracketMatch): boolean {
  return (
    a !== undefined &&
    a.player1Seed === b.player1Seed &&
    a.player2Seed === b.player2Seed &&
    a.status === b.status
  );
}

function writeAdvanceDiff(
  ctx: BracketContext,
  before: BracketMatch[],
  result: AdvanceResult,
  reported: number,
): void {
  const byNumber = new Map(before.map((m) => [m.matchNumber, m]));
  const byes = new Set(result.byeMatches);

  for (const updated of result.updatedMatches) {
    const row = ctx.rowByNumber.get(updated.matchNumber);
    if (
      !row ||
      updated.matchNumber === reported ||
      sameSlots(byNumber.get(updated.matchNumber), updated)
    ) {
      continue;
    }
    row.player1Id = lookup(updated.player1Seed, ctx.participantBySeed);
    row.player2Id = lookup(updated.player2Seed, ctx.participantBySeed);
    if (byes.has(updated.matchNumber)) {
      row.winnerId = lookup(updated.winnerSeed, ctx.participantBySeed);
      row.status = "bye";
    } else {
      row.status = updated.status;
    }
  }
}

// A forfeit can open a match against another dropped player
function forfeitDroppedFrontier(
  ctx: BracketContext,
  bracket: BracketMatch[],
  frontier: number[],
  dropped: Set<string>,
  events: TournamentEvent[],
): void {
  let current = bracket;
  let pending = frontier;

  while (pending.length > 0) {
    const next: number[] = [];
    for (const matchNumber of pending) {
      const open = current.find((m) => m.matchNumber === matchNumber);
      const row = ctx.rowByNumber.get(matchNumber);
      if (!open || !row || open.player1Seed === null || open.player2Seed === null) {
        continue;
      }
      const p1Id = ctx.participantBySeed.get(open.player1Seed);
      const p2Id = ctx.participantBySeed.get(open.player2Seed);
      const p1Dropped = p1Id ? dropped.has(p1Id) : false;
      const p2Dropped = p2Id ? dropped.has(p2Id) : false;
      const winnerId = p1Dropped ? p2Id : p1Id;
      const winnerSeed = p1Dropped ? open.player2Seed : open.player1Seed;
      if (!(p1Dropped || p2Dropped) || !winnerId) {
        continue;
      }

      row.winnerId = winnerId;
      row.status = "complete";
      row.forfeit = true;
      events.push({ type: "match_reported", matchId: row.id, winnerId, forfeit: true });

      const sub = advanceWinner(current, matchNumber, winnerSeed);
      writeAdvanceDiff(ctx, current, sub, matchNumber);
      current = sub.updatedMatches;
      next.push(...sub.newlyOpenMatches);
    }
    pending = next;
  }
}

export function advanceMatch(
  tournament: Tournament,
  match: Match,
  winnerId: string,
  forfeit: boolean,
  events: TournamentEvent[],
): void {
  if (match.status !== "open") {
    throw new TournamentError("match_not_open");
  }
  const ctx = loadContext(tournament, match.phaseId);
  const winnerSeed = ctx.seedByParticipant.get(winnerId);
  if (winnerSeed === undefined) {
    throw new TournamentError("winner_not_in_phase");
  }

  const result = advanceWinner(ctx.bracket, match.matchNumber, winnerSeed);
  const advanced = result.updatedMatches.find((m) => m.matchNumber === match.matchNumber);
  if (advanced?.status !== "complete") {
    throw new TournamentError("winner_not_in_match");
  }

  writeAdvanceDiff(ctx, ctx.bracket, result, match.matchNumber);
  match.winnerId = winnerId;
  match.status = "complete";
  match.forfeit = forfeit;
  events.push({ type: "match_reported", matchId: match.id, winnerId, forfeit });

  const dropped = new Set(
    tournament.participants
      .filter((p) => p.status === "dropped" && ctx.seedByParticipant.has(p.id))
      .map((p) => p.id),
  );
  if (dropped.size > 0) {
    forfeitDroppedFrontier(ctx, result.updatedMatches, result.newlyOpenMatches, dropped, events);
  }
}

export function reopenCascade(tournament: Tournament, match: Match): void {
  const ctx = loadContext(tournament, match.phaseId);
  const result = reopenMatch(ctx.bracket, match.matchNumber);
  const invalidated = new Set(result.cascadeInvalidated);

  for (const updated of result.updatedMatches) {
    const row = ctx.rowByNumber.get(updated.matchNumber);
    if (!row || !invalidated.has(updated.matchNumber)) {
      continue;
    }
    row.player1Id = lookup(updated.player1Seed, ctx.participantBySeed);
    row.player2Id = lookup(updated.player2Seed, ctx.participantBySeed);
    row.winnerId = null;
    row.status = row.player1Id && row.player2Id ? "open" : "pending";
    row.forfeit = false;
  }

  match.winnerId = null;
  match.status = "open";
  match.forfeit = false;
}
