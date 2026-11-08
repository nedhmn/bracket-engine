import { fileURLToPath } from "node:url";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import * as schema from "./schema.ts";

export function connect(url: string, max?: number) {
  return drizzle({ client: new Pool({ connectionString: url, max }), schema });
}

export type Db = ReturnType<typeof connect>;
export type Tx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export function databaseUrl(): string {
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile(new URL("../../../.env", import.meta.url));
    } catch {}
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

// Tests delete rows
export function testDatabaseUrl(): string {
  const url = new URL(databaseUrl());
  if (!url.pathname.endsWith("_test")) {
    url.pathname += "_test";
  }
  return url.toString();
}

export async function migrateDatabase(url: string): Promise<void> {
  // One connection so the session lock covers the migration; test runs migrate in parallel
  const db = connect(url, 1);
  try {
    await db.execute(sql`select pg_advisory_lock(hashtext('migrate'))`);
    await migrate(db, { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
  } finally {
    await db.$client.end();
  }
}
