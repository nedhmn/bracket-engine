# Getting started

Node 24 and pnpm. Docker for the example app.

## Run

```sh
pnpm install
pnpm dev
```

`pnpm dev` starts the playground on Vite. Pick a field size and a format, click winners,
reopen a match, undo, cut a Swiss field to a top N.

## The example app

Needs Postgres. Compose starts one with a `tournament-engine` and a `tournament-engine_test`
database. The host port is set in `.env` so it never collides with another Postgres.

```sh
cp .env.example .env
docker compose up -d --wait
pnpm --filter tournament-engine db:migrate
pnpm --filter tournament-engine cli --help
```

A six-player Swiss event, start to finish. Ids are shortened here.

```sh
$ pnpm --filter tournament-engine cli create "Weekly 12" --format swiss --rounds 3
9933…ef9c

$ pnpm --filter tournament-engine cli join 9933…ef9c Ana
18f1…8019
# join Ben, Cy, Dee, Eli, Fay the same way

$ pnpm --filter tournament-engine cli start 9933…ef9c
started with 6 participants

$ pnpm --filter tournament-engine cli show 9933…ef9c
Weekly 12  underway
participants
  18f1…8019  Ana
  ...
phase 1  swiss  underway  round 1/3
  deba…3512  r1 #1  open      Ana vs Eli
  12ab…f892  r1 #2  open      Ben vs Cy
  a439…977b  r1 #3  open      Dee vs Fay

$ pnpm --filter tournament-engine cli report deba…3512 18f1…8019
recorded. 0 match(es) opened
# report the other two matches; the last one pairs round 2
recorded. 0 match(es) opened, next swiss round paired

$ pnpm --filter tournament-engine cli drop 1541…d15c
dropped, 1 match(es) forfeited

$ pnpm --filter tournament-engine cli topcut 9933…ef9c --size 4 --format single_elimination
Swiss phase has rounds left to play

$ pnpm --filter tournament-engine cli end 9933…ef9c
2 matches are unresolved. Resolve them or pass --force.
```

Report the remaining rounds, then `topcut` opens a second phase and `end` writes final
standings. `reopen <match-id>` undoes a result and every match that depended on it.

## Check

```sh
pnpm gate
```

Same steps as CI, in the same order. See [CONTRIBUTING.md](../CONTRIBUTING.md).
