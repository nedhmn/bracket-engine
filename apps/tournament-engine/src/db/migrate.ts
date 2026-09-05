import { migrate } from "drizzle-orm/node-postgres/migrator";

import { connect, databaseUrl } from "./client.ts";

const db = connect(databaseUrl());
await migrate(db, { migrationsFolder: "./drizzle" });
await db.$client.end();
