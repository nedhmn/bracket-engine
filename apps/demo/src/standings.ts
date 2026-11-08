import type { Phase, Tournament } from "tournament-engine";
import { phaseStandings, reportResult, swissRankings } from "tournament-engine";

export type Placement = {
  id: string;
  rank: number | null;
};

const SETTLE_LIMIT = 200;

// Byes count as wins, as in the engine's swiss and elimination standings
export function records(tournament: Tournament, phaseId?: string): Map<string, string> {
  const tally = new Map<string, { losses: number; wins: number }>();
  const bump = (id: string, key: "losses" | "wins") => {
    const row = tally.get(id) ?? { losses: 0, wins: 0 };
    row[key] += 1;
    tally.set(id, row);
  };
  for (const m of tournament.matches) {
    const decided = m.status === "complete" || m.status === "bye";
    if ((phaseId !== undefined && m.phaseId !== phaseId) || !decided || m.winnerId === null) {
      continue;
    }
    bump(m.winnerId, "wins");
    const loser = m.player1Id === m.winnerId ? m.player2Id : m.player1Id;
    if (loser !== null) {
      bump(loser, "losses");
    }
  }
  return new Map(
    tournament.participants.map((p) => {
      const row = tally.get(p.id) ?? { losses: 0, wins: 0 };
      return [p.id, `${row.wins}-${row.losses}`];
    }),
  );
}

export function seedsOf(tournament: Tournament, phaseId: string): Map<string, number> {
  return new Map(
    tournament.phaseParticipants
      .filter((r) => r.phaseId === phaseId)
      .map((r) => [r.participantId, r.seed]),
  );
}

// An eliminated player's place is fixed, so any playout of the rest reveals it
function settle(tournament: Tournament, phaseId: string): Tournament {
  let t = tournament;
  for (let i = 0; i < SETTLE_LIMIT; i++) {
    const open = t.matches.find((m) => m.phaseId === phaseId && m.status === "open");
    const winnerId = open === undefined ? null : (open.player1Id ?? open.player2Id);
    if (open === undefined || winnerId === null) {
      return t;
    }
    t = reportResult(t, { matchId: open.id, winnerId }).tournament;
  }
  return t;
}

export function bracketPlacements(tournament: Tournament, phase: Phase): Placement[] {
  const seeds = seedsOf(tournament, phase.id);
  const bySeed = (a: string, b: string) => (seeds.get(a) ?? 0) - (seeds.get(b) ?? 0);

  if (phase.status === "complete") {
    return tournament.phaseParticipants
      .filter((r) => r.phaseId === phase.id)
      .toSorted((a, b) => (a.finalStanding ?? 0) - (b.finalStanding ?? 0) || a.seed - b.seed)
      .map((r) => ({ id: r.participantId, rank: r.finalStanding }));
  }

  const alive = new Set(
    tournament.matches
      .filter(
        (m) =>
          m.phaseId === phase.id &&
          m.status !== "complete" &&
          m.status !== "bye" &&
          m.status !== "unreachable",
      )
      .flatMap((m) => [m.player1Id, m.player2Id])
      .filter((id) => id !== null),
  );
  const final = new Map(
    phaseStandings(settle(tournament, phase.id), phase.id).map((s) => [s.participantId, s.rank]),
  );
  const ids = [...seeds.keys()];
  return [
    ...ids
      .filter((id) => alive.has(id))
      .toSorted(bySeed)
      .map((id) => ({ id, rank: null })),
    ...ids
      .filter((id) => !alive.has(id))
      .toSorted((a, b) => (final.get(a) ?? 0) - (final.get(b) ?? 0) || bySeed(a, b))
      .map((id) => ({ id, rank: final.get(id) ?? null })),
  ];
}

export function overallPlacements(tournament: Tournament, swiss: Phase, cut: Phase): Placement[] {
  const top = bracketPlacements(tournament, cut);
  const inCut = new Set(top.map((r) => r.id));
  const rest = swissRankings(tournament, swiss.id).filter((r) => !inCut.has(r.participantId));
  const rows = [
    ...top,
    ...rest.map((r) => ({
      id: r.participantId,
      rank: top.length + 1 + rest.findIndex((o) => o.rank === r.rank),
    })),
  ];
  if (tournament.status !== "complete") {
    return rows;
  }
  const final = new Map(tournament.participants.map((p) => [p.id, p.finalStanding]));
  return rows
    .map((r) => ({ id: r.id, rank: final.get(r.id) ?? r.rank }))
    .toSorted((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
}
