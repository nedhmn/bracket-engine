import type { MatchResult, Standing } from "@bracket-engine/core";
import {
  buildSwissStandings,
  calculateMantisRankings,
  generateSwissRound,
} from "@bracket-engine/core";
import { and, eq, or } from "drizzle-orm";

import type { Tx } from "../db/client.ts";
import type { Match } from "../db/schema.ts";
import {
  matchesTable,
  participantsTable,
  phaseParticipantsTable,
  phasesTable,
} from "../db/schema.ts";
import { lockPhase } from "./locks.ts";

async function loadPhaseParticipants(tx: Tx, phaseId: string) {
  return await tx
    .select({ id: participantsTable.id, status: participantsTable.status })
    .from(phaseParticipantsTable)
    .innerJoin(participantsTable, eq(phaseParticipantsTable.participantId, participantsTable.id))
    .where(eq(phaseParticipantsTable.phaseId, phaseId));
}

async function loadCompletedMatches(tx: Tx, phaseId: string) {
  return await tx
    .select()
    .from(matchesTable)
    .where(
      and(
        eq(matchesTable.phaseId, phaseId),
        or(eq(matchesTable.status, "complete"), eq(matchesTable.status, "bye")),
      ),
    );
}

function toMatchResults(matches: Match[]): MatchResult[] {
  return matches.map((m) => ({
    winnerId: m.winnerId,
    player1Id: m.player1Id ?? "",
    player2Id: m.player2Id,
    roundNumber: m.roundNumber,
  }));
}

export async function generateNextSwissRound(tx: Tx, phaseId: string) {
  await lockPhase(tx, phaseId);

  const participants = await loadPhaseParticipants(tx, phaseId);
  const completed = await loadCompletedMatches(tx, phaseId);
  const [phase] = await tx
    .select({ currentRound: phasesTable.currentRound })
    .from(phasesTable)
    .where(eq(phasesTable.id, phaseId));
  const nextRound = (phase?.currentRound ?? 0) + 1;

  const standings: Standing[] = buildSwissStandings(
    participants.map((p) => ({ participantId: p.id, dropped: p.status === "dropped" })),
    toMatchResults(completed),
  );
  const pairings = generateSwissRound(standings, nextRound);

  const existing = await tx
    .select({ matchNumber: matchesTable.matchNumber })
    .from(matchesTable)
    .where(eq(matchesTable.phaseId, phaseId));
  let matchNumber = Math.max(0, ...existing.map((m) => m.matchNumber));

  const inserted: Match[] = [];
  for (const pairing of pairings) {
    matchNumber++;
    const isBye = pairing.player2 === null;
    const rows = await tx
      .insert(matchesTable)
      .values({
        phaseId,
        matchNumber,
        roundNumber: nextRound,
        player1Id: pairing.player1,
        player2Id: pairing.player2,
        winnerId: isBye ? pairing.player1 : null,
        status: isBye ? "bye" : "open",
      })
      .returning();
    inserted.push(...rows);
  }

  await tx.update(phasesTable).set({ currentRound: nextRound }).where(eq(phasesTable.id, phaseId));
  return inserted;
}

export async function isRoundComplete(
  tx: Tx,
  phaseId: string,
  roundNumber: number,
): Promise<boolean> {
  const rows = await tx
    .select({ status: matchesTable.status })
    .from(matchesTable)
    .where(and(eq(matchesTable.phaseId, phaseId), eq(matchesTable.roundNumber, roundNumber)));
  return rows.length > 0 && rows.every((m) => m.status === "complete" || m.status === "bye");
}

export async function maybeAdvanceSwissRound(
  tx: Tx,
  phaseId: string,
  completedRoundNumber: number,
) {
  const [phase] = await tx
    .select({
      format: phasesTable.format,
      currentRound: phasesTable.currentRound,
      rounds: phasesTable.rounds,
    })
    .from(phasesTable)
    .where(eq(phasesTable.id, phaseId));
  if (
    phase?.format !== "swiss" ||
    phase.currentRound === null ||
    phase.rounds === null ||
    phase.currentRound >= phase.rounds
  ) {
    return false;
  }

  await lockPhase(tx, phaseId);

  // Re-check under the lock
  const [locked] = await tx
    .select({ currentRound: phasesTable.currentRound })
    .from(phasesTable)
    .where(eq(phasesTable.id, phaseId));
  if (locked?.currentRound !== completedRoundNumber) {
    return false;
  }
  if (!(await isRoundComplete(tx, phaseId, completedRoundNumber))) {
    return false;
  }

  await generateNextSwissRound(tx, phaseId);
  return true;
}

export async function swissRankings(tx: Tx, phaseId: string) {
  const participants = await loadPhaseParticipants(tx, phaseId);
  const completed = await loadCompletedMatches(tx, phaseId);
  return calculateMantisRankings(
    participants.map((p) => p.id),
    toMatchResults(completed),
  );
}

export async function calculateSwissFinalStandings(tx: Tx, phaseId: string) {
  for (const ranking of await swissRankings(tx, phaseId)) {
    await tx
      .update(phaseParticipantsTable)
      .set({ finalStanding: ranking.rank })
      .where(
        and(
          eq(phaseParticipantsTable.phaseId, phaseId),
          eq(phaseParticipantsTable.participantId, ranking.participantId),
        ),
      );
  }
}
