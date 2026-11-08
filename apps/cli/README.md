# cli

Runs a tournament on Postgres from the command line: participants, phases, matches, drops, top cuts, final standings. It parses arguments, calls `tournament-engine` actions through `@repo/db`, and prints the result.

```sh
pnpm --filter cli cli --help
```
