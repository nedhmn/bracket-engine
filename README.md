<h1 align="center">Bracket Engine</h1>

<p align="center"><strong>Tournament brackets, Swiss pairing and standings in TypeScript</strong></p>

<p align="center">
  <a href="https://nedhmn.github.io/bracket-engine"><strong>Demo</strong></a> ·
  <a href="./docs/getting-started.md"><strong>Getting started</strong></a> ·
  <a href="./CONTRIBUTING.md"><strong>Contributing</strong></a>
</p>

<p align="center">
  <img alt="MIT" src="https://img.shields.io/badge/license-MIT-blue.svg">
  <img alt="CI" src="https://github.com/nedhmn/bracket-engine/actions/workflows/ci.yml/badge.svg">
</p>

## What this is

Pure functions for running a tournament: seeding, single and double elimination with
byes and grand finals, advancing and reopening matches, Swiss pairing, standings. Plain
data in, plain data out.

The example app runs those on Postgres: participants, phases, matches, drops, top cuts
and final standings, driven by a CLI and tested against a real database in CI.

## Packages

| Package                   | What it does                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `@bracket-engine/core`    | Seeding, single and double elimination, byes, advancement, reopening, Swiss pairing, standings |
| `@bracket-engine/blossom` | Edmonds' blossom algorithm for maximum-weight matching. `core` uses it to pair Swiss rounds    |

## Apps

| App                      | What it is                                                         |
| ------------------------ | ------------------------------------------------------------------ |
| `apps/web`               | The playground deployed at https://nedhmn.github.io/bracket-engine |
| `apps/tournament-engine` | The packages running a tournament on Postgres, driven by a CLI     |

## Quick start

```sh
pnpm install
pnpm dev
```

Everything else is in [docs/](./docs/README.md).

## License

MIT.
