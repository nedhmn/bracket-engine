import { desc, eq } from "drizzle-orm";

import type { Tx } from "../db/client.ts";
import { participantsTable, phaseParticipantsTable, phasesTable } from "../db/schema.ts";
import { calculateEliminationFinalStandings } from "./elimination.ts";
import { EngineError } from "./errors.ts";
import { calculateSwissFinalStandings } from "./swiss.ts";

export async function calculateFinalStandings(tx: Tx, phaseId: string) {
  const [phase] = await tx
    .select({ format: phasesTable.format })
    .from(phasesTable)
    .where(eq(phasesTable.id, phaseId));
  if (!phase) {
    throw new EngineError("Phase not found");
  }
  if (phase.format === "swiss") {
    await calculateSwissFinalStandings(tx, phaseId);
  } else {
    await calculateEliminationFinalStandings(tx, phaseId);
  }
}

// Latest phase first: a top cut outranks the field it was cut from
export async function calculateTournamentFinalStandings(tx: Tx, tournamentId: string) {
  const phases = await tx
    .select({ id: phasesTable.id })
    .from(phasesTable)
    .where(eq(phasesTable.tournamentId, tournamentId))
    .orderBy(desc(phasesTable.position));

  const tournamentRank = new Map<string, number>();
  let offset = 0;

  for (const phase of phases) {
    const rows = await tx
      .select({
        participantId: phaseParticipantsTable.participantId,
        finalStanding: phaseParticipantsTable.finalStanding,
      })
      .from(phaseParticipantsTable)
      .where(eq(phaseParticipantsTable.phaseId, phase.id));

    const unplaced = rows
      .flatMap((r) =>
        r.finalStanding === null || tournamentRank.has(r.participantId)
          ? []
          : [{ participantId: r.participantId, standing: r.finalStanding }],
      )
      .toSorted(
        (a, b) => a.standing - b.standing || a.participantId.localeCompare(b.participantId),
      );

    let prev: number | null = null;
    let rank = offset;
    unplaced.forEach((row, index) => {
      if (row.standing !== prev) {
        rank = offset + index + 1;
        prev = row.standing;
      }
      tournamentRank.set(row.participantId, rank);
    });
    offset += unplaced.length;
  }

  for (const [participantId, rank] of tournamentRank) {
    await tx
      .update(participantsTable)
      .set({ finalStanding: rank })
      .where(eq(participantsTable.id, participantId));
  }
}
