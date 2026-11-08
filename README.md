<h1 align="center">Tournament Engine</h1>

<p align="center"><strong>Single elimination, double elimination and Swiss in TypeScript</strong></p>

<p align="center">
  <a href="https://nedhmn.github.io/bracket-engine"><strong>Demo</strong></a> ·
  <a href="./packages/engine/README.md"><strong>npm package</strong></a> ·
  <a href="./docs/getting-started.md"><strong>Getting started</strong></a> ·
  <a href="./CONTRIBUTING.md"><strong>Contributing</strong></a>
</p>

<p align="center">
  <img alt="MIT" src="https://img.shields.io/badge/license-MIT-blue.svg">
  <img alt="CI" src="https://github.com/nedhmn/bracket-engine/actions/workflows/ci.yml/badge.svg">
</p>

## What this is

Pure functions for running a tournament: seeding, single and double elimination with
byes and grand finals, Swiss pairing, drops, top cuts, reopened results and standings.
Plain data in, plain data out.

## Three ways to use it

1. **Try it:** the [demo](https://nedhmn.github.io/bracket-engine) runs a full tournament
   in the browser and shows every engine call it makes.
2. **Self-host:** clone the repo and run the demo, or the CLI on Postgres. See
   [getting started](./docs/getting-started.md).
3. **In your project:** `npm i tournament-engine`. The
   [package README](./packages/engine/README.md) has an example.

## Reference checks

- **Double elimination:** the losers bracket is wired the same as Challonge's at 19
  sizes from 4 to 64 players.
- **Swiss:** at 18 sizes from 5 to 64 players, pairings have no rematches, float players
  no further than a FIDE pairing engine, and give the bye no higher.

```sh
pnpm --filter tournament-engine test challonge fide
```

## Packages

| Package             | What it does                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `tournament-engine` | Seeding, single and double elimination, byes, advancement, reopening, Swiss pairing, standings           |
| `@repo/blossom`     | Edmonds' blossom algorithm for maximum-weight matching. `tournament-engine` uses it to pair Swiss rounds |
| `@repo/db`          | Drizzle schema, migrations and persistence of engine state on Postgres                                   |

## Apps

| App         | What it is                                                                            |
| ----------- | ------------------------------------------------------------------------------------- |
| `apps/demo` | A full tournament in the browser, deployed at https://nedhmn.github.io/bracket-engine |
| `apps/cli`  | A CLI running a tournament on Postgres through `@repo/db`                             |

## License

MIT.
