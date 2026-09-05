import type { GrandFinalType } from "@bracket-engine/core";
import { calculateRecommendedRounds } from "@bracket-engine/core";
import { and, asc, desc, eq, or } from "drizzle-orm";

import type { Db, Tx } from "../db/client.ts";
import type { EliminationFormat, Phase, PhaseFormat } from "../db/schema.ts";
import {
  matchesTable,
  participantsTable,
  phaseParticipantsTable,
  phasesTable,
  tournamentsTable,
} from "../db/schema.ts";
import { countUnresolvedMatches } from "./completion.ts";
import {
  advanceMatchResult,
  generateAndInsertBracket,
  reopenMatchAndCascade,
} from "./elimination.ts";
import { EngineError } from "./errors.ts";
import { calculateFinalStandings, calculateTournamentFinalStandings } from "./standings.ts";
import {
  calculateSwissFinalStandings,
  generateNextSwissRound,
  maybeAdvanceSwissRound,
  swissRankings,
} from "./swiss.ts";

export type CreateTournamentInput = {
  name: string;
  format: PhaseFormat;
  rounds?: number;
  grandFinalType?: GrandFinalType;
};

async function loadTournament(tx: Tx, tournamentId: string) {
  const [tournament] = await tx
    .select()
    .from(tournamentsTable)
    .where(eq(tournamentsTable.id, tournamentId));
  if (!tournament) {
    throw new EngineError("Tournament not found");
  }
  return tournament;
}

async function loadLatestPhase(tx: Tx, tournamentId: string): Promise<Phase> {
  const [phase] = await tx
    .select()
    .from(phasesTable)
    .where(eq(phasesTable.tournamentId, tournamentId))
    .orderBy(desc(phasesTable.position))
    .limit(1);
  if (!phase) {
    throw new EngineError("Tournament has no phases");
  }
  return phase;
}

export async function createTournament(db: Db, input: CreateTournamentInput) {
  return await db.transaction(async (tx) => {
    const [tournament] = await tx.insert(tournamentsTable).values({ name: input.name }).returning();
    if (!tournament) {
      throw new EngineError("Insert returned no tournament");
    }
    await tx.insert(phasesTable).values({
      tournamentId: tournament.id,
      format: input.format,
      position: 1,
      rounds: input.format === "swiss" ? (input.rounds ?? null) : null,
      grandFinalType:
        input.format === "double_elimination" ? (input.grandFinalType ?? "double") : null,
    });
    return tournament;
  });
}

export async function addParticipant(db: Db, tournamentId: string, name: string) {
  const tournament = await loadTournament(db, tournamentId);
  if (tournament.status !== "pending") {
    throw new EngineError("Participants can only join before the tournament starts");
  }
  const [participant] = await db
    .insert(participantsTable)
    .values({ tournamentId, name })
    .returning();
  if (!participant) {
    throw new EngineError("Insert returned no participant");
  }
  return participant;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}

export type StartOptions = {
  random?: () => number;
};

export async function startTournament(db: Db, tournamentId: string, options: StartOptions = {}) {
  const tournament = await loadTournament(db, tournamentId);
  if (tournament.status !== "pending") {
    throw new EngineError("Tournament has already started");
  }
  const [phase] = await db
    .select()
    .from(phasesTable)
    .where(eq(phasesTable.tournamentId, tournamentId))
    .orderBy(asc(phasesTable.position))
    .limit(1);
  if (!phase) {
    throw new EngineError("Tournament has no phases");
  }

  const active = await db
    .select()
    .from(participantsTable)
    .where(
      and(eq(participantsTable.tournamentId, tournamentId), eq(participantsTable.status, "active")),
    );
  if (active.length < 2) {
    throw new EngineError("At least 2 participants are required to start");
  }

  const seeded = shuffle(active, options.random ?? Math.random).map((p, i) => ({
    participantId: p.id,
    seed: i + 1,
  }));

  return await db.transaction(async (tx) => {
    await tx
      .insert(phaseParticipantsTable)
      .values(seeded.map((s) => ({ phaseId: phase.id, ...s })));

    if (phase.format === "swiss") {
      const rounds = phase.rounds ?? calculateRecommendedRounds(active.length);
      await tx.update(phasesTable).set({ rounds }).where(eq(phasesTable.id, phase.id));
      await generateNextSwissRound(tx, phase.id);
    } else {
      await generateAndInsertBracket(
        tx,
        phase.id,
        seeded,
        phase.format,
        phase.grandFinalType ?? "double",
      );
    }

    await tx.update(phasesTable).set({ status: "underway" }).where(eq(phasesTable.id, phase.id));
    const [updated] = await tx
      .update(tournamentsTable)
      .set({ status: "underway" })
      .where(eq(tournamentsTable.id, tournamentId))
      .returning();
    return { tournament: updated, phase, seeds: seeded };
  });
}

export async function reportResult(db: Db, matchId: string, winnerId: string) {
  return await db.transaction(async (tx) => {
    const opened = await advanceMatchResult(tx, matchId, winnerId);
    const [match] = await tx
      .select({ phaseId: matchesTable.phaseId, roundNumber: matchesTable.roundNumber })
      .from(matchesTable)
      .where(eq(matchesTable.id, matchId));
    const advancedRound = match
      ? await maybeAdvanceSwissRound(tx, match.phaseId, match.roundNumber)
      : false;
    return { opened, advancedRound };
  });
}

export async function dropParticipant(db: Db, participantId: string) {
  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.id, participantId));
  if (!participant) {
    throw new EngineError("Participant not found");
  }
  if (participant.status === "dropped") {
    throw new EngineError("Participant has already dropped");
  }
  const tournament = await loadTournament(db, participant.tournamentId);
  if (tournament.status === "complete") {
    throw new EngineError("Cannot drop from a completed tournament");
  }
  if (tournament.status === "pending") {
    await db.delete(participantsTable).where(eq(participantsTable.id, participantId));
    return { action: "deleted" as const };
  }

  return await db.transaction(async (tx) => {
    await tx
      .update(participantsTable)
      .set({ status: "dropped" })
      .where(eq(participantsTable.id, participantId));
    const open = await tx
      .select()
      .from(matchesTable)
      .where(
        and(
          or(eq(matchesTable.player1Id, participantId), eq(matchesTable.player2Id, participantId)),
          eq(matchesTable.status, "open"),
        ),
      );
    for (const match of open) {
      const opponentId = match.player1Id === participantId ? match.player2Id : match.player1Id;
      if (opponentId) {
        await advanceMatchResult(tx, match.id, opponentId, { forfeit: true });
        await maybeAdvanceSwissRound(tx, match.phaseId, match.roundNumber);
      }
    }
    return { action: "dropped" as const, forfeited: open.length };
  });
}

export async function reopenMatch(db: Db, matchId: string) {
  const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, matchId));
  if (!match) {
    throw new EngineError("Match not found");
  }
  const [phase] = await db.select().from(phasesTable).where(eq(phasesTable.id, match.phaseId));
  if (!phase || phase.status === "complete") {
    throw new EngineError("Phase is complete; standings are published");
  }
  // Later swiss pairings were derived from this result
  if (
    phase.format === "swiss" &&
    phase.currentRound !== null &&
    match.roundNumber < phase.currentRound
  ) {
    throw new EngineError("A later swiss round has been paired from this result");
  }
  const players = await db
    .select({ status: participantsTable.status })
    .from(participantsTable)
    .where(
      or(
        eq(participantsTable.id, match.player1Id ?? ""),
        eq(participantsTable.id, match.player2Id ?? ""),
      ),
    );
  if (players.some((p) => p.status === "dropped")) {
    throw new EngineError("A dropped participant cannot be re-paired");
  }
  await db.transaction((tx) => reopenMatchAndCascade(tx, matchId));
}

export type TopCutInput = {
  format: EliminationFormat;
  size: number;
  grandFinalType?: GrandFinalType;
};

export async function createTopCut(db: Db, tournamentId: string, input: TopCutInput) {
  const previous = await loadLatestPhase(db, tournamentId);
  if (previous.format !== "swiss") {
    throw new EngineError("A top cut follows a swiss phase");
  }
  if (previous.status === "pending") {
    throw new EngineError("Swiss phase has not started");
  }
  if (previous.status === "underway" && previous.currentRound !== previous.rounds) {
    throw new EngineError("Swiss phase has rounds left to play");
  }
  if (previous.status === "underway" && (await countUnresolvedMatches(db, [previous.id])) > 0) {
    throw new EngineError("Swiss phase has unresolved matches");
  }

  return await db.transaction(async (tx) => {
    const rankings = await swissRankings(tx, previous.id);
    const seeded = rankings
      .slice(0, input.size)
      .map((r, i) => ({ participantId: r.participantId, seed: i + 1 }));
    if (seeded.length < 2) {
      throw new EngineError("A top cut needs at least 2 participants");
    }

    if (previous.status === "underway") {
      await calculateSwissFinalStandings(tx, previous.id);
      await tx
        .update(phasesTable)
        .set({ status: "complete" })
        .where(eq(phasesTable.id, previous.id));
    }

    const grandFinalType =
      input.format === "double_elimination" ? (input.grandFinalType ?? "double") : null;
    const [next] = await tx
      .insert(phasesTable)
      .values({
        tournamentId,
        format: input.format,
        position: previous.position + 1,
        status: "underway",
        grandFinalType,
      })
      .returning();
    if (!next) {
      throw new EngineError("Insert returned no phase");
    }
    await tx.insert(phaseParticipantsTable).values(seeded.map((s) => ({ phaseId: next.id, ...s })));
    await generateAndInsertBracket(tx, next.id, seeded, input.format, grandFinalType ?? "double");
    return { phase: next, seeds: seeded };
  });
}

export async function endTournament(db: Db, tournamentId: string, force = false) {
  const tournament = await loadTournament(db, tournamentId);
  if (tournament.status !== "underway") {
    throw new EngineError("Tournament must be underway to finalize");
  }
  const active = await db
    .select()
    .from(phasesTable)
    .where(and(eq(phasesTable.tournamentId, tournamentId), eq(phasesTable.status, "underway")));
  if (active.length === 0) {
    throw new EngineError("Tournament has no active phase");
  }
  const unresolved = await countUnresolvedMatches(
    db,
    active.map((p) => p.id),
  );
  if (unresolved > 0 && !force) {
    throw new EngineError(`${unresolved} matches are unresolved. Resolve them or pass --force.`);
  }

  return await db.transaction(async (tx) => {
    for (const phase of active) {
      await calculateFinalStandings(tx, phase.id);
      await tx.update(phasesTable).set({ status: "complete" }).where(eq(phasesTable.id, phase.id));
    }
    await calculateTournamentFinalStandings(tx, tournamentId);
    const [updated] = await tx
      .update(tournamentsTable)
      .set({ status: "complete" })
      .where(eq(tournamentsTable.id, tournamentId))
      .returning();
    return updated;
  });
}

export async function showTournament(db: Db, tournamentId: string) {
  const tournament = await loadTournament(db, tournamentId);
  const participants = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.tournamentId, tournamentId))
    .orderBy(asc(participantsTable.name));
  const phases = await db
    .select()
    .from(phasesTable)
    .where(eq(phasesTable.tournamentId, tournamentId))
    .orderBy(asc(phasesTable.position));
  const matches = phases.length
    ? await db
        .select()
        .from(matchesTable)
        .where(or(...phases.map((p) => eq(matchesTable.phaseId, p.id))))
        .orderBy(asc(matchesTable.roundNumber), asc(matchesTable.matchNumber))
    : [];
  return { tournament, participants, phases, matches };
}
