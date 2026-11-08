# Getting started

Node 26, pnpm 12, Docker.

```sh
git clone https://github.com/nedhmn/tournament-engine.git
cd tournament-engine
pnpm install
```

## Demo

```sh
pnpm dev
```

Opens the demo at http://localhost:5173/tournament-engine/. Tournaments live in memory, so a
refresh starts over.

## CLI on Postgres

```sh
cp .env.example .env
docker compose up -d --wait
pnpm --filter @repo/db db:migrate
pnpm --filter cli cli --help
```

A six-player Swiss event. Ids are shortened.

```sh
$ pnpm --filter cli cli create "Weekly 12" --format swiss --rounds 3
9933…ef9c

$ pnpm --filter cli cli join 9933…ef9c Ana
18f1…8019
# join Ben, Cy, Dee, Eli, Fay the same way

$ pnpm --filter cli cli start 9933…ef9c
started with 6 participants

$ pnpm --filter cli cli show 9933…ef9c
Weekly 12  underway
participants
  18f1…8019  Ana
  # Ben to Fay
phase 1  swiss  underway  round 1/3
  deba…3512  r1 #1  open      Ana vs Eli
  12ab…f892  r1 #2  open      Ben vs Cy
  a439…977b  r1 #3  open      Dee vs Fay

$ pnpm --filter cli cli report deba…3512 18f1…8019
recorded. 0 match(es) opened
# the last report of a round pairs the next one

$ pnpm --filter cli cli drop 1541…d15c
dropped, 1 match(es) forfeited
```

After the last round, `topcut` opens an elimination phase and `end` writes final
standings. `reopen <match-id>` undoes a result and everything that depended on it.
