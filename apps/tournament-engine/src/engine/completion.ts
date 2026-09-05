import { and, inArray, or, eq } from "drizzle-orm";

import type { Tx } from "../db/client.ts";
import { matchesTable } from "../db/schema.ts";

export async function countUnresolvedMatches(tx: Tx, phaseIds: string[]): Promise<number> {
  if (phaseIds.length === 0) {
    return 0;
  }
  const rows = await tx
    .select({ id: matchesTable.id })
    .from(matchesTable)
    .where(
      and(
        inArray(matchesTable.phaseId, phaseIds),
        or(eq(matchesTable.status, "open"), eq(matchesTable.status, "pending")),
      ),
    );
  return rows.length;
}
