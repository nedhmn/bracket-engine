# tournament-engine

Single elimination, double elimination and Swiss tournaments as pure functions over plain data. ESM, no dependencies, Node 22.12 or later and browsers.

```sh
npm i tournament-engine
```

```ts
import {
  createTournament,
  joinTournament,
  phaseStandings,
  reportResult,
  startTournament,
} from "tournament-engine";

let { tournament } = createTournament({ id: "weekly-12", name: "Weekly 12", format: "swiss" });
for (const name of ["Ana", "Ben", "Cy", "Dee"]) {
  ({ tournament } = joinTournament(tournament, { name }));
}
({ tournament } = startTournament(tournament, {
  seeding: tournament.participants.map((p) => p.id),
}));

const match = tournament.matches.find((m) => m.status === "open")!;
const result = reportResult(tournament, { matchId: match.id, winnerId: match.player1Id! });

console.log(result.events);
console.log(phaseStandings(result.tournament, result.tournament.phases[0].id));
```

Every action takes a tournament and an input and returns the next tournament with the events it caused. It never mutates its argument and throws a `TournamentError` with a `code` when the move is not allowed. The tournament is JSON, so store it however you like.

| Action                            | What it does                                              |
| --------------------------------- | --------------------------------------------------------- |
| `createTournament`                | A pending tournament with one phase: Swiss or elimination |
| `joinTournament`                  | Adds a participant before the start                       |
| `startTournament`                 | Takes the seeding and opens the first round               |
| `reportResult`                    | Records a winner and opens what follows                   |
| `reopenResult`, `canReopenResult` | Clears a result and everything that depended on it        |
| `dropParticipant`                 | Drops a player and forfeits their open matches            |
| `createTopCut`                    | Starts an elimination phase seeded by Swiss rank          |
| `endTournament`                   | Ends the tournament and writes final standings            |
| `phaseStandings`, `swissRankings` | Standings for a phase, Swiss with its three tiebreakers   |

[Demo](https://nedhmn.github.io/bracket-engine) · [Source](https://github.com/nedhmn/bracket-engine)
