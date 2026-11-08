import type { Tournament } from "tournament-engine";
import { createTournament, joinTournament, reportResult, startTournament } from "tournament-engine";
import { describe, expect, it } from "vitest";

import { parseTournament } from "../src/parse.ts";

function underway(): Tournament {
  let t = createTournament({ id: "t1", name: "Cup", format: "double_elimination" }).tournament;
  for (const name of ["Ana", "Ben", "Cy", "Dee", "Eli"]) {
    t = joinTournament(t, { name }).tournament;
  }
  t = startTournament(t, { seeding: t.participants.map((p) => p.id) }).tournament;
  const open = t.matches.find((m) => m.status === "open");
  if (!open?.player1Id) {
    throw new Error("expected an open match");
  }
  return reportResult(t, { matchId: open.id, winnerId: open.player1Id }).tournament;
}

describe("parseTournament", () => {
  it("round-trips engine state", () => {
    const t = underway();
    expect(parseTournament(JSON.stringify(t))).toStrictEqual(t);
  });

  it("rejects invalid json", () => {
    expect(parseTournament("{not json")).toBeNull();
  });

  it("rejects a non-object", () => {
    expect(parseTournament("[]")).toBeNull();
    expect(parseTournament("null")).toBeNull();
  });

  it("rejects a missing field", () => {
    const { matches: _, ...rest } = underway();
    expect(parseTournament(JSON.stringify(rest))).toBeNull();
  });

  it("rejects an unknown enum value", () => {
    const t = underway();
    expect(parseTournament(JSON.stringify({ ...t, status: "paused" }))).toBeNull();
  });

  it("rejects a wrong nested type", () => {
    const t = underway();
    const [first, ...others] = t.matches;
    const broken = { ...t, matches: [{ ...first, roundNumber: "1" }, ...others] };
    expect(parseTournament(JSON.stringify(broken))).toBeNull();
  });
});
