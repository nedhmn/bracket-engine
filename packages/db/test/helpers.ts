import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";
import type { ActionResult, Match, PhaseFormat, Tournament } from "tournament-engine";
import { createTournament, joinTournament, reportResult, startTournament } from "tournament-engine";

import type { Db } from "../src/client.ts";
import { connect, testDatabaseUrl } from "../src/client.ts";
import { tournamentsTable } from "../src/schema.ts";
import { insertTournament, loadTournament, runAction } from "../src/tournament.ts";

export function testDb(): Db {
  return connect(testDatabaseUrl());
}

// Test files share the database with other packages, so each removes only its own rows
const created: string[] = [];

export async function removeCreated(db: Db): Promise<void> {
  if (created.length > 0) {
    await db.delete(tournamentsTable).where(inArray(tournamentsTable.id, created.splice(0)));
  }
}

export async function newTournament(
  db: Db,
  name: string,
  format: PhaseFormat,
  rounds?: number,
): Promise<string> {
  const id = randomUUID();
  created.push(id);
  await insertTournament(db, createTournament({ id, name, format, rounds }));
  return id;
}

export async function seedTournament(
  db: Db,
  format: PhaseFormat,
  playerCount: number,
  rounds?: number,
): Promise<Tournament> {
  const id = await newTournament(db, `${format} ${playerCount}`, format, rounds);
  for (let i = 1; i <= playerCount; i++) {
    await runAction(db, id, (t) => joinTournament(t, { name: `p${String(i).padStart(2, "0")}` }));
  }
  // Seed n is the nth participant to join
  const { tournament } = await runAction(db, id, (t) =>
    startTournament(t, { seeding: t.participants.map((p) => p.id) }),
  );
  return tournament;
}

export async function report(
  db: Db,
  tournamentId: string,
  matchId: string,
  winnerId: string,
): Promise<ActionResult> {
  return await runAction(db, tournamentId, (t) => reportResult(t, { matchId, winnerId }));
}

export async function matchesFor(db: Db, tournamentId: string, phaseId: string): Promise<Match[]> {
  return (await loadTournament(db, tournamentId)).matches.filter((m) => m.phaseId === phaseId);
}

export function requireDefined<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) {
    throw new Error(`expected ${what}`);
  }
  return value;
}
