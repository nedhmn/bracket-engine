import { migrateDatabase, testDatabaseUrl } from "@repo/db";

export default async function setup(): Promise<void> {
  await migrateDatabase(testDatabaseUrl());
}
