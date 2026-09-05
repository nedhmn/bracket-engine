<h1 align="center">Bracket Engine</h1>

<p align="center"><strong>Tournament brackets, Swiss pairing and standings in TypeScript</strong></p>

<p align="center">
  <a href="https://nedhmn.github.io/bracket-engine"><strong>Demo</strong></a> ·
  <a href="./docs/getting-started.md"><strong>Getting started</strong></a> ·
  <a href="./docs/architecture.md"><strong>Architecture</strong></a> ·
  <a href="./CONTRIBUTING.md"><strong>Contributing</strong></a>
</p>

<p align="center">
  <img alt="MIT" src="https://img.shields.io/badge/license-MIT-blue.svg">
  <img alt="CI" src="https://github.com/nedhmn/bracket-engine/actions/workflows/ci.yml/badge.svg">
</p>

## What this is

Pure functions for running a tournament. Seed a field, generate a single or double
elimination bracket with byes and a grand final, advance winners, reopen a reported match
and cascade the reset, pair a Swiss round with maximum-weight matching, and rank the
field with standard competition ranking. Nothing here knows about a database, a user, or
a network. Input is plain data, output is plain data.

The example app turns that into a tournament service on Postgres. It stores
participants, phases and matches, locks a phase while it writes, forfeits a dropped
player's open matches, cuts a Swiss field to a top-N elimination bracket, and settles
final standings across phases. It runs from a CLI and its tests run against a real
database in CI.

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

MIT. Third-party notices are in [LICENSE](./LICENSE).
