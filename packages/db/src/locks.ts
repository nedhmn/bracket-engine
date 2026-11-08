import { sql } from "drizzle-orm";

import type { Tx } from "./client.ts";

// Actions load the whole tournament and write a diff, so writers must not interleave
export async function lockTournament(tx: Tx, tournamentId: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('tournament:' || ${tournamentId}))`);
}
