import { parseArgs } from "node:util";

import { connect, databaseUrl } from "../db/client.ts";
import type { Match, Participant } from "../db/schema.ts";
import { EngineError } from "../engine/errors.ts";
import {
  addParticipant,
  createTournament,
  createTopCut,
  dropParticipant,
  endTournament,
  reopenMatch,
  reportResult,
  showTournament,
  startTournament,
} from "../engine/tournament.ts";

const USAGE = `tournament-engine: run a tournament on Postgres with @bracket-engine/core

  create <name> --format swiss|single_elimination|double_elimination [--rounds N] [--grand-final none|simple|double]
  join <tournament-id> <name>
  start <tournament-id>
  show <tournament-id>
  report <match-id> <winner-participant-id>
  reopen <match-id>
  drop <participant-id>
  topcut <tournament-id> --size N --format single_elimination|double_elimination [--grand-final ...]
  end <tournament-id> [--force]

Reads DATABASE_URL. Ids are the uuids printed by show.`;

const FORMATS = ["swiss", "single_elimination", "double_elimination"] as const;
const ELIMINATION = ["single_elimination", "double_elimination"] as const;
const GRAND_FINALS = ["none", "simple", "double"] as const;

function oneOf<const T extends readonly string[]>(
  value: string | undefined,
  allowed: T,
  flag: string,
): T[number] {
  const hit = allowed.find((v) => v === value);
  if (hit === undefined) {
    throw new EngineError(`${flag} must be one of ${allowed.join(", ")}`);
  }
  return hit;
}

function positional(args: string[], index: number, name: string): string {
  const value = args[index];
  if (value === undefined) {
    throw new EngineError(`missing <${name}>`);
  }
  return value;
}

function integer(value: string | undefined, flag: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) {
    throw new EngineError(`${flag} must be a positive integer`);
  }
  return n;
}

function renderMatch(m: Match, names: Map<string, string>) {
  const name = (id: string | null) => (id === null ? "(tbd)" : (names.get(id) ?? id));
  const section = m.bracketSection ? `${m.bracketSection} ` : "";
  const result =
    m.status === "complete" || m.status === "bye"
      ? ` -> ${name(m.winnerId)}${m.forfeit ? " (forfeit)" : ""}`
      : "";
  return `  ${m.id}  ${section}r${m.roundNumber} #${m.matchNumber}  ${m.status.padEnd(8)}  ${name(m.player1Id)} vs ${name(m.player2Id)}${result}`;
}

function renderParticipant(p: Participant) {
  const standing = p.finalStanding === null ? "" : `  #${p.finalStanding}`;
  return `  ${p.id}  ${p.name}${p.status === "dropped" ? " (dropped)" : ""}${standing}`;
}

async function main(argv: string[]) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      format: { type: "string" },
      rounds: { type: "string" },
      size: { type: "string" },
      "grand-final": { type: "string" },
      force: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  const [command, ...args] = positionals;
  if (values.help || command === undefined) {
    console.log(USAGE);
    return;
  }

  const db = connect(databaseUrl());
  try {
    switch (command) {
      case "create": {
        const format = oneOf(values.format, FORMATS, "--format");
        const t = await createTournament(db, {
          name: positional(args, 0, "name"),
          format,
          rounds: integer(values.rounds, "--rounds"),
          grandFinalType:
            values["grand-final"] === undefined
              ? undefined
              : oneOf(values["grand-final"], GRAND_FINALS, "--grand-final"),
        });
        console.log(t.id);
        return;
      }
      case "join": {
        const p = await addParticipant(
          db,
          positional(args, 0, "tournament-id"),
          positional(args, 1, "name"),
        );
        console.log(p.id);
        return;
      }
      case "start": {
        const { seeds } = await startTournament(db, positional(args, 0, "tournament-id"));
        console.log(`started with ${seeds.length} participants`);
        return;
      }
      case "report": {
        const { opened, advancedRound } = await reportResult(
          db,
          positional(args, 0, "match-id"),
          positional(args, 1, "winner-id"),
        );
        console.log(
          `recorded. ${opened.length} match(es) opened${advancedRound ? ", next swiss round paired" : ""}`,
        );
        return;
      }
      case "reopen": {
        await reopenMatch(db, positional(args, 0, "match-id"));
        console.log("reopened");
        return;
      }
      case "drop": {
        const result = await dropParticipant(db, positional(args, 0, "participant-id"));
        console.log(
          result.action === "deleted"
            ? "removed before start"
            : `dropped, ${result.forfeited} match(es) forfeited`,
        );
        return;
      }
      case "topcut": {
        const size = integer(values.size, "--size");
        if (size === undefined) {
          throw new EngineError("--size is required");
        }
        const { phase, seeds } = await createTopCut(db, positional(args, 0, "tournament-id"), {
          format: oneOf(values.format, ELIMINATION, "--format"),
          size,
          grandFinalType:
            values["grand-final"] === undefined
              ? undefined
              : oneOf(values["grand-final"], GRAND_FINALS, "--grand-final"),
        });
        console.log(`phase ${phase.position} (${phase.format}) seeded with ${seeds.length}`);
        return;
      }
      case "end": {
        await endTournament(db, positional(args, 0, "tournament-id"), values.force);
        console.log("finalized");
        return;
      }
      case "show": {
        const { tournament, participants, phases, matches } = await showTournament(
          db,
          positional(args, 0, "tournament-id"),
        );
        const names = new Map(participants.map((p) => [p.id, p.name]));
        console.log(`${tournament.name}  ${tournament.status}`);
        console.log("participants");
        for (const p of participants) {
          console.log(renderParticipant(p));
        }
        for (const phase of phases) {
          const round =
            phase.currentRound === null
              ? ""
              : `  round ${phase.currentRound}/${phase.rounds ?? "?"}`;
          console.log(`phase ${phase.position}  ${phase.format}  ${phase.status}${round}`);
          for (const m of matches.filter((x) => x.phaseId === phase.id)) {
            console.log(renderMatch(m, names));
          }
        }
        return;
      }
      default:
        throw new EngineError(`unknown command "${command}"\n\n${USAGE}`);
    }
  } finally {
    await db.$client.end();
  }
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  if (error instanceof EngineError) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
