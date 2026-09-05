import { migrate } from "drizzle-orm/node-postgres/migrator";

import { connect, testDatabaseUrl } from "./client.ts";

export default async function setup() {
  const db = connect(testDatabaseUrl());
  await migrate(db, { migrationsFolder: "./drizzle" });
  await db.$client.end();
}
