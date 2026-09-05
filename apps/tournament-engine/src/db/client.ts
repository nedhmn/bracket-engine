import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.ts";

export function connect(url: string) {
  return drizzle({ client: new Pool({ connectionString: url }), schema });
}

export type Db = ReturnType<typeof connect>;
export type Tx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export function databaseUrl(): string {
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile(new URL("../../../../.env", import.meta.url));
    } catch {}
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

// Tests truncate tables
export function testDatabaseUrl(): string {
  const url = new URL(databaseUrl());
  if (!url.pathname.endsWith("_test")) {
    url.pathname += "_test";
  }
  return url.toString();
}
