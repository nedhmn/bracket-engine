import type { AdvanceResult, BracketMatch, GrandFinalType } from "@bracket-engine/core";
import {
  advanceWinner,
  calculateEliminationStandings,
  generateDoubleElimination,
  generateSingleElimination,
  propagateByes,
  reopenMatch as reopenBracketMatch,
} from "@bracket-engine/core";
import { and, eq } from "drizzle-orm";

import type { Tx } from "../db/client.ts";
import type { EliminationFormat } from "../db/schema.ts";
import { matchesTable, participantsTable, phaseParticipantsTable } from "../db/schema.ts";
import type { SeededParticipant } from "./context.ts";
import {
  buildMatchNumberToDbId,
  buildSeedToParticipant,
  loadBracketContext,
  resolvePlayerIds,
} from "./context.ts";
import { EngineError } from "./errors.ts";
import { lockPhase } from "./locks.ts";

type Ctx = Awaited<ReturnType<typeof loadBracketContext>>;

export async function generateAndInsertBracket(
  tx: Tx,
  phaseId: string,
  participants: SeededParticipant[],
  format: EliminationFormat,
  grandFinalType: GrandFinalType = "double",
) {
  const seedToParticipant = buildSeedToParticipant(participants);

  let allMatches: BracketMatch[];
  if (format === "single_elimination") {
    allMatches = generateSingleElimination(participants.length);
  } else {
    const result = generateDoubleElimination(participants.length, grandFinalType);
    allMatches = [...result.winners, ...result.losers, ...result.grandFinal];
  }
  allMatches = propagateByes(allMatches);

  const inserted = await tx
    .insert(matchesTable)
    .values(
      allMatches.map((match) => {
        const { p1Id, p2Id } = resolvePlayerIds(match, seedToParticipant);
        return {
          phaseId,
          matchNumber: match.matchNumber,
          roundNumber: match.roundNumber,
          bracketSection: match.bracketSection,
          player1Id: p1Id,
          player2Id: p2Id,
          winnerId:
            match.winnerSeed === null ? null : (seedToParticipant.get(match.winnerSeed) ?? null),
          status: match.status,
        };
      }),
    )
    .returning({ id: matchesTable.id, matchNumber: matchesTable.matchNumber });

  // Next-match ids exist only after the first insert
  const numToDbId = buildMatchNumberToDbId(inserted);
  for (const match of allMatches) {
    const dbId = numToDbId.get(match.matchNumber);
    if (!dbId) {
      continue;
    }
    const nextMatchId = match.nextMatchNumber
      ? (numToDbId.get(match.nextMatchNumber) ?? null)
      : null;
    const loserNextMatchId = match.loserNextMatchNumber
      ? (numToDbId.get(match.loserNextMatchNumber) ?? null)
      : null;
    if (nextMatchId || loserNextMatchId || match.nextMatchSlot || match.loserNextMatchSlot) {
      await tx
        .update(matchesTable)
        .set({
          nextMatchId,
          nextMatchSlot: match.nextMatchSlot,
          loserNextMatchId,
          loserNextMatchSlot: match.loserNextMatchSlot,
        })
        .where(eq(matchesTable.id, dbId));
    }
  }

  return inserted;
}

function sameSlots(a: BracketMatch | undefined, b: BracketMatch) {
  return (
    a !== undefined &&
    a.player1Seed === b.player1Seed &&
    a.player2Seed === b.player2Seed &&
    a.status === b.status
  );
}

async function writeAdvanceDiff(
  tx: Tx,
  ctx: Ctx,
  before: BracketMatch[],
  result: AdvanceResult,
  reported: number,
) {
  const byNumber = new Map(before.map((m) => [m.matchNumber, m]));
  const byes = new Set(result.byeMatches);

  for (const updated of result.updatedMatches) {
    if (updated.matchNumber === reported || sameSlots(byNumber.get(updated.matchNumber), updated)) {
      continue;
    }
    const dbId = ctx.numberToId.get(updated.matchNumber);
    if (!dbId) {
      continue;
    }
    const { p1Id, p2Id } = resolvePlayerIds(updated, ctx.seedToParticipant);
    if (byes.has(updated.matchNumber)) {
      const winnerId =
        updated.winnerSeed === null
          ? null
          : (ctx.seedToParticipant.get(updated.winnerSeed) ?? null);
      await tx
        .update(matchesTable)
        .set({ player1Id: p1Id, player2Id: p2Id, winnerId, status: "bye" })
        .where(eq(matchesTable.id, dbId));
    } else {
      await tx
        .update(matchesTable)
        .set({ player1Id: p1Id, player2Id: p2Id, status: updated.status })
        .where(eq(matchesTable.id, dbId));
    }
  }
}

async function loadDroppedIds(tx: Tx, phaseId: string) {
  const rows = await tx
    .select({ id: participantsTable.id })
    .from(phaseParticipantsTable)
    .innerJoin(participantsTable, eq(phaseParticipantsTable.participantId, participantsTable.id))
    .where(
      and(eq(phaseParticipantsTable.phaseId, phaseId), eq(participantsTable.status, "dropped")),
    );
  return new Set(rows.map((r) => r.id));
}

// A forfeit can open a match against another dropped player
async function forfeitDroppedFrontier(
  tx: Tx,
  ctx: Ctx,
  matches: BracketMatch[],
  frontier: string[],
  dropped: Set<string>,
): Promise<string[]> {
  const stillOpen: string[] = [];
  let current = matches;
  let pending = frontier;

  while (pending.length > 0) {
    const next: string[] = [];
    for (const dbId of pending) {
      const matchNumber = ctx.idToNumber.get(dbId);
      const open = current.find((m) => m.matchNumber === matchNumber);
      if (
        matchNumber === undefined ||
        !open ||
        open.player1Seed === null ||
        open.player2Seed === null
      ) {
        stillOpen.push(dbId);
        continue;
      }
      const p1Id = ctx.seedToParticipant.get(open.player1Seed);
      const p2Id = ctx.seedToParticipant.get(open.player2Seed);
      const p1Dropped = p1Id ? dropped.has(p1Id) : false;
      const p2Dropped = p2Id ? dropped.has(p2Id) : false;
      const winnerId = p1Dropped ? p2Id : p1Id;
      const winnerSeed = p1Dropped ? open.player2Seed : open.player1Seed;
      if (!(p1Dropped || p2Dropped) || !winnerId) {
        stillOpen.push(dbId);
        continue;
      }

      await tx
        .update(matchesTable)
        .set({ winnerId, status: "complete", forfeit: true })
        .where(eq(matchesTable.id, dbId));

      const sub = advanceWinner(current, matchNumber, winnerSeed);
      await writeAdvanceDiff(tx, ctx, current, sub, matchNumber);
      current = sub.updatedMatches;
      for (const n of sub.newlyOpenMatches) {
        const id = ctx.numberToId.get(n);
        if (id) {
          next.push(id);
        }
      }
    }
    pending = next;
  }
  return stillOpen;
}

export type AdvanceOptions = {
  forfeit?: boolean;
};

export async function advanceMatchResult(
  tx: Tx,
  matchId: string,
  winnerId: string,
  options: AdvanceOptions = {},
) {
  const [match] = await tx.select().from(matchesTable).where(eq(matchesTable.id, matchId));
  if (!match) {
    throw new EngineError("Match not found");
  }

  await lockPhase(tx, match.phaseId);

  // Re-check under the lock
  const [locked] = await tx
    .select({ status: matchesTable.status })
    .from(matchesTable)
    .where(eq(matchesTable.id, matchId));
  if (locked?.status !== "open") {
    throw new EngineError("Match is not open for reporting");
  }

  const ctx = await loadBracketContext(tx, match.phaseId);
  const winnerSeed = ctx.participantToSeed.get(winnerId);
  if (winnerSeed === undefined) {
    throw new EngineError("Winner is not in this phase");
  }

  const result = advanceWinner(ctx.bracketMatches, match.matchNumber, winnerSeed);
  const advanced = result.updatedMatches.find((m) => m.matchNumber === match.matchNumber);
  if (advanced?.status !== "complete") {
    throw new EngineError("Winner must be one of the match participants");
  }

  await writeAdvanceDiff(tx, ctx, ctx.bracketMatches, result, match.matchNumber);
  await tx
    .update(matchesTable)
    .set({ winnerId, status: "complete", forfeit: options.forfeit ?? false })
    .where(eq(matchesTable.id, matchId));

  const newlyOpen = result.newlyOpenMatches.flatMap((n) => ctx.numberToId.get(n) ?? []);
  const dropped = await loadDroppedIds(tx, match.phaseId);
  if (dropped.size === 0) {
    return newlyOpen;
  }
  return await forfeitDroppedFrontier(tx, ctx, result.updatedMatches, newlyOpen, dropped);
}

export async function reopenMatchAndCascade(tx: Tx, matchId: string) {
  const [match] = await tx.select().from(matchesTable).where(eq(matchesTable.id, matchId));
  if (!match) {
    throw new EngineError("Match not found");
  }
  // Reopening a bye strands a one-player match
  if (match.status === "bye") {
    throw new EngineError("Bye matches cannot be reopened");
  }

  await lockPhase(tx, match.phaseId);

  const ctx = await loadBracketContext(tx, match.phaseId);
  const result = reopenBracketMatch(ctx.bracketMatches, match.matchNumber);
  const invalidated = new Set(result.cascadeInvalidated);

  for (const updated of result.updatedMatches) {
    const dbId = ctx.numberToId.get(updated.matchNumber);
    if (!invalidated.has(updated.matchNumber) || !dbId) {
      continue;
    }
    const { p1Id, p2Id } = resolvePlayerIds(updated, ctx.seedToParticipant);
    await tx
      .update(matchesTable)
      .set({
        player1Id: p1Id,
        player2Id: p2Id,
        winnerId: null,
        status: p1Id && p2Id ? "open" : "pending",
        forfeit: false,
      })
      .where(eq(matchesTable.id, dbId));
  }

  await tx
    .update(matchesTable)
    .set({ winnerId: null, status: "open", forfeit: false })
    .where(eq(matchesTable.id, matchId));
}

export async function calculateEliminationFinalStandings(tx: Tx, phaseId: string) {
  const participants = await tx
    .select({ id: phaseParticipantsTable.participantId, seed: phaseParticipantsTable.seed })
    .from(phaseParticipantsTable)
    .where(eq(phaseParticipantsTable.phaseId, phaseId));
  const matches = await tx.select().from(matchesTable).where(eq(matchesTable.phaseId, phaseId));

  const standings = calculateEliminationStandings(matches, participants);
  for (const [participantId, entry] of standings) {
    await tx
      .update(phaseParticipantsTable)
      .set({ finalStanding: entry.rank })
      .where(
        and(
          eq(phaseParticipantsTable.phaseId, phaseId),
          eq(phaseParticipantsTable.participantId, participantId),
        ),
      );
  }
}
