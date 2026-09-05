import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";

import type { Db } from "../../db/client.ts";
import { connect, testDatabaseUrl } from "../../db/client.ts";
import type { PhaseFormat } from "../../db/schema.ts";
import { matchesTable } from "../../db/schema.ts";
import { addParticipant, createTournament, startTournament } from "../tournament.ts";

export function testDb(): Db {
  return connect(testDatabaseUrl());
}

export async function truncateAll(db: Db) {
  await db.execute(sql`truncate tournaments cascade`);
}

// Identity shuffle: seed n is participant n
const ordered = () => 0;

export async function seedTournament(
  db: Db,
  format: PhaseFormat,
  playerCount: number,
  rounds?: number,
) {
  const tournament = await createTournament(db, {
    name: `${format} ${playerCount}`,
    format,
    rounds,
  });
  const participants = [];
  for (let i = 1; i <= playerCount; i++) {
    participants.push(await addParticipant(db, tournament.id, `p${String(i).padStart(2, "0")}`));
  }
  const { phase, seeds } = await startTournament(db, tournament.id, { random: ordered });
  return { tournament, phase, participants, seeds };
}

export async function matchesFor(db: Db, phaseId: string) {
  return await db.select().from(matchesTable).where(eq(matchesTable.phaseId, phaseId));
}

export function requireDefined<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) {
    throw new Error(`expected ${what}`);
  }
  return value;
}
