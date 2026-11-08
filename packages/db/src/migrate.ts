import { databaseUrl, migrateDatabase } from "./client.ts";

await migrateDatabase(databaseUrl());
