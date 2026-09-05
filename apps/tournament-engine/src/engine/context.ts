import type { BracketMatch } from "@bracket-engine/core";
import { eq } from "drizzle-orm";

import type { Tx } from "../db/client.ts";
import type { Match } from "../db/schema.ts";
import { matchesTable, phaseParticipantsTable } from "../db/schema.ts";

export type SeededParticipant = {
  participantId: string;
  seed: number;
};

export function buildSeedToParticipant(participants: SeededParticipant[]): Map<number, string> {
  return new Map(participants.map((p) => [p.seed, p.participantId]));
}

export function buildParticipantToSeed(participants: SeededParticipant[]): Map<string, number> {
  return new Map(participants.map((p) => [p.participantId, p.seed]));
}

export function buildMatchNumberToDbId(
  matches: Array<{ id: string; matchNumber: number }>,
): Map<number, string> {
  return new Map(matches.map((m) => [m.matchNumber, m.id]));
}

function buildMatchDbIdToNumber(
  matches: Array<{ id: string; matchNumber: number }>,
): Map<string, number> {
  return new Map(matches.map((m) => [m.id, m.matchNumber]));
}

function lookup<K, V>(key: K | null, map: Map<K, V>): V | null {
  return key === null ? null : (map.get(key) ?? null);
}

function toBracketMatches(
  matches: Match[],
  participantToSeed: Map<string, number>,
  idToNumber: Map<string, number>,
): BracketMatch[] {
  return matches.map((m) => ({
    matchNumber: m.matchNumber,
    roundNumber: m.roundNumber,
    bracketSection: m.bracketSection,
    player1Seed: lookup(m.player1Id, participantToSeed),
    player2Seed: lookup(m.player2Id, participantToSeed),
    nextMatchNumber: lookup(m.nextMatchId, idToNumber),
    nextMatchSlot: m.nextMatchSlot,
    loserNextMatchNumber: lookup(m.loserNextMatchId, idToNumber),
    loserNextMatchSlot: m.loserNextMatchSlot,
    status: m.status,
    winnerSeed: lookup(m.winnerId, participantToSeed),
  }));
}

export function resolvePlayerIds(match: BracketMatch, seedToParticipant: Map<number, string>) {
  return {
    p1Id: lookup(match.player1Seed, seedToParticipant),
    p2Id: lookup(match.player2Seed, seedToParticipant),
  };
}

export async function loadBracketContext(tx: Tx, phaseId: string) {
  const matches = await tx.select().from(matchesTable).where(eq(matchesTable.phaseId, phaseId));
  const participants = await tx
    .select({
      participantId: phaseParticipantsTable.participantId,
      seed: phaseParticipantsTable.seed,
    })
    .from(phaseParticipantsTable)
    .where(eq(phaseParticipantsTable.phaseId, phaseId));

  const participantToSeed = buildParticipantToSeed(participants);
  const seedToParticipant = buildSeedToParticipant(participants);
  const idToNumber = buildMatchDbIdToNumber(matches);
  const numberToId = buildMatchNumberToDbId(matches);

  return {
    matches,
    participants,
    participantToSeed,
    seedToParticipant,
    idToNumber,
    numberToId,
    bracketMatches: toBracketMatches(matches, participantToSeed, idToNumber),
  };
}
