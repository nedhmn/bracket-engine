import { expect } from "vitest";

import {
  createTournament,
  joinTournament,
  reportResult,
  startTournament,
  TournamentError,
} from "../../src/index.ts";
import type {
  ActionResult,
  GrandFinalType,
  Match,
  PhaseFormat,
  Tournament,
  TournamentErrorCode,
} from "../../src/index.ts";

export function seeded(
  format: PhaseFormat,
  playerCount: number,
  rounds?: number,
  grandFinalType?: GrandFinalType,
): Tournament {
  let t = createTournament({
    id: "t1",
    name: `${format} ${playerCount}`,
    format,
    rounds,
    grandFinalType,
  }).tournament;
  for (let i = 1; i <= playerCount; i++) {
    t = joinTournament(t, { name: `p${String(i).padStart(2, "0")}` }).tournament;
  }
  return startTournament(t, { seeding: t.participants.map((p) => p.id) }).tournament;
}

export function phaseId(t: Tournament, position: number): string {
  return required(
    t.phases.find((p) => p.position === position),
    `phase ${position}`,
  ).id;
}

export function matchesIn(t: Tournament, phase: string): Match[] {
  return t.matches.filter((m) => m.phaseId === phase);
}

export function openIn(t: Tournament, phase: string): Match[] {
  return matchesIn(t, phase).filter((m) => m.status === "open");
}

export function player1(m: Match): string {
  return required(m.player1Id, `player1 of ${m.id}`);
}

export function player2(m: Match): string {
  return required(m.player2Id, `player2 of ${m.id}`);
}

export function playOut(t: Tournament, phase: string): Tournament {
  let current = t;
  for (;;) {
    const open = openIn(current, phase)[0];
    if (!open) {
      return current;
    }
    current = reportResult(current, { matchId: open.id, winnerId: player1(open) }).tournament;
  }
}

export function required<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) {
    throw new Error(`expected ${what}`);
  }
  return value;
}

export function expectCode(action: () => ActionResult, code: TournamentErrorCode): void {
  let caught: TournamentError | null = null;
  try {
    action();
  } catch (error) {
    if (error instanceof TournamentError) {
      caught = error;
    } else {
      throw error;
    }
  }
  expect(caught?.code).toBe(code);
}
