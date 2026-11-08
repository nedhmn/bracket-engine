import { migrateDatabase, testDatabaseUrl } from "../src/client.ts";

export default async function setup(): Promise<void> {
  await migrateDatabase(testDatabaseUrl());
}
