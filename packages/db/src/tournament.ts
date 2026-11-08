import { randomUUID } from "node:crypto";

import { and, asc, eq, inArray } from "drizzle-orm";
import type { ActionResult, Tournament, TournamentEvent } from "tournament-engine";

import type { Db, Tx } from "./client.ts";
import { lockTournament } from "./locks.ts";
import {
  matchesTable,
  participantsTable,
  phaseParticipantsTable,
  phasesTable,
  tournamentsTable,
} from "./schema.ts";

export class NotFoundError extends Error {
  override readonly name = "NotFoundError";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadTournament(tx: Tx, tournamentId: string): Promise<Tournament> {
  const [row] = UUID.test(tournamentId)
    ? await tx
        .select({
          id: tournamentsTable.id,
          name: tournamentsTable.name,
          status: tournamentsTable.status,
        })
        .from(tournamentsTable)
        .where(eq(tournamentsTable.id, tournamentId))
    : [];
  if (!row) {
    throw new NotFoundError("Tournament not found");
  }
  const participants = await tx
    .select({
      id: participantsTable.id,
      name: participantsTable.name,
      status: participantsTable.status,
      finalStanding: participantsTable.finalStanding,
    })
    .from(participantsTable)
    .where(eq(participantsTable.tournamentId, tournamentId))
    .orderBy(asc(participantsTable.createdAt), asc(participantsTable.id));
  const phases = await tx
    .select({
      id: phasesTable.id,
      format: phasesTable.format,
      position: phasesTable.position,
      status: phasesTable.status,
      rounds: phasesTable.rounds,
      currentRound: phasesTable.currentRound,
      grandFinalType: phasesTable.grandFinalType,
    })
    .from(phasesTable)
    .where(eq(phasesTable.tournamentId, tournamentId))
    .orderBy(asc(phasesTable.position));
  const phaseParticipants = await tx
    .select({
      phaseId: phaseParticipantsTable.phaseId,
      participantId: phaseParticipantsTable.participantId,
      seed: phaseParticipantsTable.seed,
      finalStanding: phaseParticipantsTable.finalStanding,
    })
    .from(phaseParticipantsTable)
    .innerJoin(phasesTable, eq(phaseParticipantsTable.phaseId, phasesTable.id))
    .where(eq(phasesTable.tournamentId, tournamentId))
    .orderBy(asc(phasesTable.position), asc(phaseParticipantsTable.seed));
  const matches = await tx
    .select({
      id: matchesTable.id,
      phaseId: matchesTable.phaseId,
      matchNumber: matchesTable.matchNumber,
      roundNumber: matchesTable.roundNumber,
      bracketSection: matchesTable.bracketSection,
      player1Id: matchesTable.player1Id,
      player2Id: matchesTable.player2Id,
      winnerId: matchesTable.winnerId,
      nextMatchId: matchesTable.nextMatchId,
      nextMatchSlot: matchesTable.nextMatchSlot,
      loserNextMatchId: matchesTable.loserNextMatchId,
      loserNextMatchSlot: matchesTable.loserNextMatchSlot,
      status: matchesTable.status,
      forfeit: matchesTable.forfeit,
    })
    .from(matchesTable)
    .innerJoin(phasesTable, eq(matchesTable.phaseId, phasesTable.id))
    .where(eq(phasesTable.tournamentId, tournamentId))
    .orderBy(asc(phasesTable.position), asc(matchesTable.matchNumber));

  return {
    ...row,
    // Stored ids are uuids, so any sequence yields a fresh engine id
    participantSequence: participants.length,
    participants,
    phases,
    phaseParticipants,
    matches,
  };
}

function remapEvent(event: TournamentEvent, id: (value: string) => string): TournamentEvent {
  switch (event.type) {
    case "tournament_created":
    case "tournament_started":
    case "tournament_completed":
      return event;
    case "participant_joined":
    case "participant_removed":
    case "participant_dropped":
      return { ...event, participantId: id(event.participantId) };
    case "phase_started":
    case "phase_completed":
    case "swiss_round_paired":
      return { ...event, phaseId: id(event.phaseId) };
    case "match_opened":
    case "match_reopened":
      return { ...event, matchId: id(event.matchId) };
    case "match_reported":
      return { ...event, matchId: id(event.matchId), winnerId: id(event.winnerId) };
  }
}

// The engine names new rows p<n>, phase<n> and <phase>-m<n>; rows get uuids on first save
function assignIds(before: Tournament | null, result: ActionResult): ActionResult {
  const t = result.tournament;
  const known = new Set([t.id]);
  for (const row of [
    ...(before?.participants ?? []),
    ...(before?.phases ?? []),
    ...(before?.matches ?? []),
  ]) {
    known.add(row.id);
  }
  const assigned = new Map<string, string>();
  const id = (value: string): string => {
    if (known.has(value)) {
      return value;
    }
    const existing = assigned.get(value);
    if (existing) {
      return existing;
    }
    const fresh = randomUUID();
    assigned.set(value, fresh);
    return fresh;
  };
  const ref = (value: string | null): string | null => (value === null ? null : id(value));

  return {
    tournament: {
      ...t,
      participants: t.participants.map((p) => ({ ...p, id: id(p.id) })),
      phases: t.phases.map((p) => ({ ...p, id: id(p.id) })),
      phaseParticipants: t.phaseParticipants.map((p) => ({
        ...p,
        phaseId: id(p.phaseId),
        participantId: id(p.participantId),
      })),
      matches: t.matches.map((m) => ({
        ...m,
        id: id(m.id),
        phaseId: id(m.phaseId),
        player1Id: ref(m.player1Id),
        player2Id: ref(m.player2Id),
        winnerId: ref(m.winnerId),
        nextMatchId: ref(m.nextMatchId),
        loserNextMatchId: ref(m.loserNextMatchId),
      })),
    },
    events: result.events.map((e) => remapEvent(e, id)),
  };
}

type Diff<T> = { deleted: T[]; inserted: T[]; updated: T[] };

function diff<T extends object>(
  before: T[],
  after: T[],
  key: (row: T) => string,
  fields: (keyof T)[],
): Diff<T> {
  const previous = new Map(before.map((row) => [key(row), row]));
  const kept = new Set(after.map(key));
  return {
    deleted: before.filter((row) => !kept.has(key(row))),
    inserted: after.filter((row) => !previous.has(key(row))),
    updated: after.filter((row) => {
      const old = previous.get(key(row));
      return old !== undefined && fields.some((f) => old[f] !== row[f]);
    }),
  };
}

const pairKey = (p: { participantId: string; phaseId: string }): string =>
  `${p.phaseId}:${p.participantId}`;

export async function saveTournament(
  tx: Tx,
  before: Tournament | null,
  result: ActionResult,
): Promise<ActionResult> {
  const saved = assignIds(before, result);
  const after = saved.tournament;
  const tournamentId = after.id;

  if (before === null) {
    await tx
      .insert(tournamentsTable)
      .values({ id: tournamentId, name: after.name, status: after.status });
  } else if (before.name !== after.name || before.status !== after.status) {
    await tx
      .update(tournamentsTable)
      .set({ name: after.name, status: after.status })
      .where(eq(tournamentsTable.id, tournamentId));
  }

  const participants = diff(before?.participants ?? [], after.participants, (p) => p.id, [
    "name",
    "status",
    "finalStanding",
  ]);
  const phases = diff(before?.phases ?? [], after.phases, (p) => p.id, [
    "format",
    "position",
    "status",
    "rounds",
    "currentRound",
    "grandFinalType",
  ]);
  const seeds = diff(before?.phaseParticipants ?? [], after.phaseParticipants, pairKey, [
    "seed",
    "finalStanding",
  ]);
  const matches = diff(before?.matches ?? [], after.matches, (m) => m.id, [
    "matchNumber",
    "roundNumber",
    "bracketSection",
    "player1Id",
    "player2Id",
    "winnerId",
    "nextMatchId",
    "nextMatchSlot",
    "loserNextMatchId",
    "loserNextMatchSlot",
    "status",
    "forfeit",
  ]);

  if (matches.deleted.length > 0) {
    await tx.delete(matchesTable).where(
      inArray(
        matchesTable.id,
        matches.deleted.map((m) => m.id),
      ),
    );
  }
  for (const p of seeds.deleted) {
    await tx
      .delete(phaseParticipantsTable)
      .where(
        and(
          eq(phaseParticipantsTable.phaseId, p.phaseId),
          eq(phaseParticipantsTable.participantId, p.participantId),
        ),
      );
  }
  if (phases.deleted.length > 0) {
    await tx.delete(phasesTable).where(
      inArray(
        phasesTable.id,
        phases.deleted.map((p) => p.id),
      ),
    );
  }
  if (participants.deleted.length > 0) {
    await tx.delete(participantsTable).where(
      inArray(
        participantsTable.id,
        participants.deleted.map((p) => p.id),
      ),
    );
  }

  if (participants.inserted.length > 0) {
    await tx
      .insert(participantsTable)
      .values(participants.inserted.map((p) => ({ ...p, tournamentId })));
  }
  if (phases.inserted.length > 0) {
    await tx.insert(phasesTable).values(phases.inserted.map((p) => ({ ...p, tournamentId })));
  }
  if (seeds.inserted.length > 0) {
    await tx.insert(phaseParticipantsTable).values(seeds.inserted);
  }
  // One statement, so links between new matches pass the self-referencing foreign keys
  if (matches.inserted.length > 0) {
    await tx.insert(matchesTable).values(matches.inserted);
  }

  for (const { id, ...row } of participants.updated) {
    await tx.update(participantsTable).set(row).where(eq(participantsTable.id, id));
  }
  for (const { id, ...row } of phases.updated) {
    await tx.update(phasesTable).set(row).where(eq(phasesTable.id, id));
  }
  for (const p of seeds.updated) {
    await tx
      .update(phaseParticipantsTable)
      .set({ seed: p.seed, finalStanding: p.finalStanding })
      .where(
        and(
          eq(phaseParticipantsTable.phaseId, p.phaseId),
          eq(phaseParticipantsTable.participantId, p.participantId),
        ),
      );
  }
  for (const { id, ...row } of matches.updated) {
    await tx.update(matchesTable).set(row).where(eq(matchesTable.id, id));
  }

  return saved;
}

export async function insertTournament(db: Db, result: ActionResult): Promise<ActionResult> {
  return await db.transaction((tx) => saveTournament(tx, null, result));
}

export async function runAction(
  db: Db,
  tournamentId: string,
  action: (tournament: Tournament) => ActionResult,
): Promise<ActionResult> {
  return await db.transaction(async (tx) => {
    await lockTournament(tx, tournamentId);
    const before = await loadTournament(tx, tournamentId);
    return await saveTournament(tx, before, action(before));
  });
}

export async function tournamentIdForMatch(tx: Tx, matchId: string): Promise<string> {
  const [row] = UUID.test(matchId)
    ? await tx
        .select({ tournamentId: phasesTable.tournamentId })
        .from(matchesTable)
        .innerJoin(phasesTable, eq(matchesTable.phaseId, phasesTable.id))
        .where(eq(matchesTable.id, matchId))
    : [];
  if (!row) {
    throw new NotFoundError("Match not found");
  }
  return row.tournamentId;
}

export async function tournamentIdForParticipant(tx: Tx, participantId: string): Promise<string> {
  const [row] = UUID.test(participantId)
    ? await tx
        .select({ tournamentId: participantsTable.tournamentId })
        .from(participantsTable)
        .where(eq(participantsTable.id, participantId))
    : [];
  if (!row) {
    throw new NotFoundError("Participant not found");
  }
  return row.tournamentId;
}
