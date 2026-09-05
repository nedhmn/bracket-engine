import { sql } from "drizzle-orm";

import type { Tx } from "../db/client.ts";

// Writers snapshot the whole phase, so they must not interleave
export async function lockPhase(tx: Tx, phaseId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('phase:' || ${phaseId}))`);
}
