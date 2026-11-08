# @repo/db

Postgres persistence for `tournament-engine`: the Drizzle schema, migrations, and a layer that loads a `Tournament` from rows and saves the rows an action changed, under a per-tournament advisory lock. No tournament rules.

```ts
import { connect, databaseUrl, runAction } from "@repo/db";
import { reportResult } from "tournament-engine";

await runAction(connect(databaseUrl()), tournamentId, (t) =>
  reportResult(t, { matchId, winnerId }),
);
```

```sh
pnpm --filter @repo/db db:migrate
```
