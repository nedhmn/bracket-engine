import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";

import {
  connect,
  databaseUrl,
  insertTournament,
  loadTournament,
  NotFoundError,
  runAction,
  tournamentIdForMatch,
  tournamentIdForParticipant,
} from "@repo/db";
import type { ActionResult, Match, Participant, Phase, Tournament } from "tournament-engine";
import {
  createTopCut,
  createTournament,
  dropParticipant,
  endTournament,
  joinTournament,
  reopenResult,
  reportResult,
  startTournament,
  TournamentError,
} from "tournament-engine";

const USAGE = `tournament-engine: run a tournament on Postgres with tournament-engine

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

class UsageError extends Error {
  override readonly name = "UsageError";
}

function oneOf<const T extends readonly string[]>(
  value: string | undefined,
  allowed: T,
  flag: string,
): T[number] {
  const hit = allowed.find((v) => v === value);
  if (hit === undefined) {
    throw new UsageError(`${flag} must be one of ${allowed.join(", ")}`);
  }
  return hit;
}

function positional(args: string[], index: number, name: string): string {
  const value = args[index];
  if (value === undefined) {
    throw new UsageError(`missing <${name}>`);
  }
  return value;
}

function integer(value: string | undefined, flag: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) {
    throw new UsageError(`${flag} must be a positive integer`);
  }
  return n;
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}

function renderMatch(m: Match, names: Map<string, string>): string {
  const name = (id: string | null) => (id === null ? "(tbd)" : (names.get(id) ?? id));
  const section = m.bracketSection ? `${m.bracketSection} ` : "";
  const result =
    m.status === "complete" || m.status === "bye"
      ? ` -> ${name(m.winnerId)}${m.forfeit ? " (forfeit)" : ""}`
      : "";
  return `  ${m.id}  ${section}r${m.roundNumber} #${m.matchNumber}  ${m.status.padEnd(8)}  ${name(m.player1Id)} vs ${name(m.player2Id)}${result}`;
}

function renderParticipant(p: Participant): string {
  const standing = p.finalStanding === null ? "" : `  #${p.finalStanding}`;
  return `  ${p.id}  ${p.name}${p.status === "dropped" ? " (dropped)" : ""}${standing}`;
}

function renderTournament(t: Tournament): string[] {
  const names = new Map(t.participants.map((p) => [p.id, p.name]));
  const lines = [`${t.name}  ${t.status}`, "participants"];
  for (const p of t.participants.toSorted((a, b) => a.name.localeCompare(b.name))) {
    lines.push(renderParticipant(p));
  }
  for (const phase of t.phases.toSorted((a, b) => a.position - b.position)) {
    const round =
      phase.currentRound === null ? "" : `  round ${phase.currentRound}/${phase.rounds ?? "?"}`;
    lines.push(`phase ${phase.position}  ${phase.format}  ${phase.status}${round}`);
    for (const m of t.matches
      .filter((x) => x.phaseId === phase.id)
      .toSorted((a, b) => a.roundNumber - b.roundNumber || a.matchNumber - b.matchNumber)) {
      lines.push(renderMatch(m, names));
    }
  }
  return lines;
}

function reportSummary({ tournament, events }: ActionResult): string {
  const paired = new Set<string>();
  for (const e of events) {
    if (e.type === "swiss_round_paired") {
      paired.add(`${e.phaseId}:${e.roundNumber}`);
    }
  }
  const byId = new Map(tournament.matches.map((m) => [m.id, m]));
  // Matches of a freshly paired swiss round are reported as the pairing, not as opened
  const opened = events.filter((e) => {
    const m = e.type === "match_opened" ? byId.get(e.matchId) : undefined;
    return m !== undefined && !paired.has(`${m.phaseId}:${m.roundNumber}`);
  }).length;
  return `recorded. ${opened} match(es) opened${paired.size > 0 ? ", next swiss round paired" : ""}`;
}

function dropSummary({ tournament, events }: ActionResult, participantId: string): string {
  if (events.some((e) => e.type === "participant_removed")) {
    return "removed before start";
  }
  const byId = new Map(tournament.matches.map((m) => [m.id, m]));
  const forfeited = events.filter((e) => {
    const m = e.type === "match_reported" && e.forfeit ? byId.get(e.matchId) : undefined;
    return m !== undefined && (m.player1Id === participantId || m.player2Id === participantId);
  }).length;
  return `dropped, ${forfeited} match(es) forfeited`;
}

type StartedPhase = { phase: Phase; seeded: number };

function startedPhase({ tournament, events }: ActionResult): StartedPhase {
  const started = events.find((e) => e.type === "phase_started");
  const phase = tournament.phases.find(
    (p) => started?.type === "phase_started" && p.id === started.phaseId,
  );
  if (!phase) {
    throw new Error("no phase started");
  }
  return {
    phase,
    seeded: tournament.phaseParticipants.filter((p) => p.phaseId === phase.id).length,
  };
}

async function main(argv: string[]): Promise<void> {
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
  const grandFinal = values["grand-final"];
  const grandFinalType = () =>
    grandFinal === undefined ? undefined : oneOf(grandFinal, GRAND_FINALS, "--grand-final");

  const db = connect(databaseUrl());
  try {
    switch (command) {
      case "create": {
        const format = oneOf(values.format, FORMATS, "--format");
        const { tournament } = await insertTournament(
          db,
          createTournament({
            id: randomUUID(),
            name: positional(args, 0, "name"),
            format,
            rounds: integer(values.rounds, "--rounds"),
            grandFinalType: grandFinalType(),
          }),
        );
        console.log(tournament.id);
        return;
      }
      case "join": {
        const name = positional(args, 1, "name");
        const { events } = await runAction(db, positional(args, 0, "tournament-id"), (t) =>
          joinTournament(t, { name }),
        );
        const joined = events.find((e) => e.type === "participant_joined");
        console.log(joined?.type === "participant_joined" ? joined.participantId : "");
        return;
      }
      case "start": {
        const result = await runAction(db, positional(args, 0, "tournament-id"), (t) =>
          startTournament(t, { seeding: shuffle(t.participants.map((p) => p.id)) }),
        );
        console.log(`started with ${startedPhase(result).seeded} participants`);
        return;
      }
      case "report": {
        const matchId = positional(args, 0, "match-id");
        const winnerId = positional(args, 1, "winner-id");
        const result = await runAction(db, await tournamentIdForMatch(db, matchId), (t) =>
          reportResult(t, { matchId, winnerId }),
        );
        console.log(reportSummary(result));
        return;
      }
      case "reopen": {
        const matchId = positional(args, 0, "match-id");
        await runAction(db, await tournamentIdForMatch(db, matchId), (t) =>
          reopenResult(t, { matchId }),
        );
        console.log("reopened");
        return;
      }
      case "drop": {
        const participantId = positional(args, 0, "participant-id");
        const result = await runAction(
          db,
          await tournamentIdForParticipant(db, participantId),
          (t) => dropParticipant(t, { participantId }),
        );
        console.log(dropSummary(result, participantId));
        return;
      }
      case "topcut": {
        const size = integer(values.size, "--size");
        if (size === undefined) {
          throw new UsageError("--size is required");
        }
        const format = oneOf(values.format, ELIMINATION, "--format");
        const finalType = grandFinalType();
        const result = await runAction(db, positional(args, 0, "tournament-id"), (t) =>
          createTopCut(t, { format, size, grandFinalType: finalType }),
        );
        const { phase, seeded } = startedPhase(result);
        console.log(`phase ${phase.position} (${phase.format}) seeded with ${seeded}`);
        return;
      }
      case "end": {
        await runAction(db, positional(args, 0, "tournament-id"), (t) =>
          endTournament(t, { force: values.force }),
        );
        console.log("finalized");
        return;
      }
      case "show": {
        const tournament = await loadTournament(db, positional(args, 0, "tournament-id"));
        console.log(renderTournament(tournament).join("\n"));
        return;
      }
      default:
        throw new UsageError(`unknown command "${command}"\n\n${USAGE}`);
    }
  } finally {
    await db.$client.end();
  }
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  if (
    error instanceof UsageError ||
    error instanceof TournamentError ||
    error instanceof NotFoundError
  ) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
