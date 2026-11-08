import type { Match, Participant, Phase, PhaseParticipant, Tournament } from "tournament-engine";

type Decoder<T> = (value: unknown, path: string) => T;

class ParseError extends Error {
  override readonly name = "ParseError";
}

function fail(path: string): never {
  throw new ParseError(`invalid ${path}`);
}

const string: Decoder<string> = (value, path) => (typeof value === "string" ? value : fail(path));

const integer: Decoder<number> = (value, path) =>
  typeof value === "number" && Number.isInteger(value) ? value : fail(path);

const boolean: Decoder<boolean> = (value, path) =>
  typeof value === "boolean" ? value : fail(path);

function nullable<T>(decode: Decoder<T>): Decoder<T | null> {
  return (value, path) => (value === null ? null : decode(value, path));
}

function oneOf<const T extends readonly string[]>(allowed: T): Decoder<T[number]> {
  return (value, path) => allowed.find((a) => a === value) ?? fail(path);
}

function array<T>(decode: Decoder<T>): Decoder<T[]> {
  return (value, path) =>
    Array.isArray(value) ? value.map((item, i) => decode(item, `${path}[${i}]`)) : fail(path);
}

function fields(value: unknown, path: string) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(path);
  }
  const map = new Map<string, unknown>(Object.entries(value));
  return <T>(key: string, decode: Decoder<T>): T => decode(map.get(key), `${path}.${key}`);
}

const status = oneOf(["pending", "underway", "complete"]);
const slot = nullable(oneOf(["player1", "player2"]));

const participant: Decoder<Participant> = (value, path) => {
  const read = fields(value, path);
  return {
    finalStanding: read("finalStanding", nullable(integer)),
    id: read("id", string),
    name: read("name", string),
    status: read("status", oneOf(["active", "dropped"])),
  };
};

const phase: Decoder<Phase> = (value, path) => {
  const read = fields(value, path);
  return {
    currentRound: read("currentRound", nullable(integer)),
    format: read("format", oneOf(["swiss", "single_elimination", "double_elimination"])),
    grandFinalType: read("grandFinalType", nullable(oneOf(["none", "simple", "double"]))),
    id: read("id", string),
    position: read("position", integer),
    rounds: read("rounds", nullable(integer)),
    status: read("status", status),
  };
};

const phaseParticipant: Decoder<PhaseParticipant> = (value, path) => {
  const read = fields(value, path);
  return {
    finalStanding: read("finalStanding", nullable(integer)),
    participantId: read("participantId", string),
    phaseId: read("phaseId", string),
    seed: read("seed", integer),
  };
};

const match: Decoder<Match> = (value, path) => {
  const read = fields(value, path);
  return {
    bracketSection: read("bracketSection", nullable(oneOf(["winners", "losers", "grand_final"]))),
    forfeit: read("forfeit", boolean),
    id: read("id", string),
    loserNextMatchId: read("loserNextMatchId", nullable(string)),
    loserNextMatchSlot: read("loserNextMatchSlot", slot),
    matchNumber: read("matchNumber", integer),
    nextMatchId: read("nextMatchId", nullable(string)),
    nextMatchSlot: read("nextMatchSlot", slot),
    phaseId: read("phaseId", string),
    player1Id: read("player1Id", nullable(string)),
    player2Id: read("player2Id", nullable(string)),
    roundNumber: read("roundNumber", integer),
    status: read("status", oneOf(["pending", "open", "bye", "complete", "unreachable"])),
    winnerId: read("winnerId", nullable(string)),
  };
};

const tournament: Decoder<Tournament> = (value, path) => {
  const read = fields(value, path);
  return {
    id: read("id", string),
    matches: read("matches", array(match)),
    name: read("name", string),
    participantSequence: read("participantSequence", integer),
    participants: read("participants", array(participant)),
    phaseParticipants: read("phaseParticipants", array(phaseParticipant)),
    phases: read("phases", array(phase)),
    status: read("status", status),
  };
};

export function parseTournament(raw: string): Tournament | null {
  try {
    return tournament(JSON.parse(raw), "tournament");
  } catch {
    return null;
  }
}
