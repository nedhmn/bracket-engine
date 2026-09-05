import type { BracketSection } from "./types.ts";

type StandingsMatch = {
  bracketSection: BracketSection | null;
  matchNumber: number;
  player1Id: string | null;
  player2Id: string | null;
  roundNumber: number;
  status: string;
  winnerId: string | null;
};

type StandingsParticipant = {
  id: string;
  seed: number | null;
};

function sectionRank(section: string | null): number {
  switch (section) {
    case "grand_final":
      return 3;
    case "winners":
      return 2;
    case "losers":
      return 1;
    default:
      return 0;
  }
}

function compareAliveParticipants(
  a: StandingsParticipant,
  b: StandingsParticipant,
  aliveMeta: Map<string, { section: string | null; round: number; losses: number }>,
  seedMap: Map<string, number>,
): number {
  const ma = aliveMeta.get(a.id);
  const mb = aliveMeta.get(b.id);
  if (!(ma && mb)) {
    return 0;
  }

  const secDiff = sectionRank(mb.section) - sectionRank(ma.section);
  if (secDiff !== 0) {
    return secDiff;
  }

  const roundDiff = mb.round - ma.round;
  if (roundDiff !== 0) {
    return roundDiff;
  }

  const lossDiff = ma.losses - mb.losses;
  if (lossDiff !== 0) {
    return lossDiff;
  }

  const seedA = seedMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
  const seedB = seedMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
  if (seedA !== seedB) {
    return seedA - seedB;
  }

  if (a.id < b.id) {
    return -1;
  }
  return a.id > b.id ? 1 : 0;
}

export type EliminationStandingEntry = {
  losses: number;
  rank: number;
  wins: number;
};

type RankEntry = {
  group: string;
  id: string;
};

// Competition ranking ("1224"). ordered is finishing order, each id once.
function assignRanks(
  ordered: RankEntry[],
  records: Map<string, { wins: number; losses: number }>,
): Map<string, EliminationStandingEntry> {
  const standings = new Map<string, EliminationStandingEntry>();
  let prevGroup: string | null = null;
  let currentRank = 0;
  ordered.forEach((entry, index) => {
    if (entry.group !== prevGroup) {
      currentRank = index + 1;
      prevGroup = entry.group;
    }
    const record = records.get(entry.id) ?? { wins: 0, losses: 0 };
    standings.set(entry.id, {
      rank: currentRank,
      wins: record.wins,
      losses: record.losses,
    });
  });
  return standings;
}

function sectionFinalWinner(
  completedMatches: StandingsMatch[],
  section: BracketSection | null,
): string | null {
  let best: StandingsMatch | null = null;
  for (const m of completedMatches) {
    if (m.bracketSection !== section || !m.winnerId) {
      continue;
    }
    if (
      !best ||
      m.roundNumber > best.roundNumber ||
      (m.roundNumber === best.roundNumber && m.matchNumber > best.matchNumber)
    ) {
      best = m;
    }
  }
  return best?.winnerId ?? null;
}

function buildCompletedOrder(
  completedMatches: StandingsMatch[],
  push: (id: string, group: string) => void,
): void {
  let anyWinner = false;
  // gf=none leaves the LB final winner with no later loss to rank by
  for (const section of ["grand_final", "winners", "losers"] as const) {
    const winnerId = sectionFinalWinner(completedMatches, section);
    if (winnerId) {
      push(winnerId, `sectionwin:${section}`);
      anyWinner = true;
    }
  }
  if (!anyWinner) {
    const seWinnerId = sectionFinalWinner(completedMatches, null);
    if (seWinnerId) {
      push(seWinnerId, "sectionwin:null");
    }
  }

  for (const m of completedMatches) {
    if (!m.winnerId) {
      continue;
    }
    const loserId = m.player1Id === m.winnerId ? m.player2Id : m.player1Id;
    if (loserId) {
      // Descending walk meets the deepest loss first; push ignores a second entry
      push(loserId, `elim:${m.bracketSection}:${m.roundNumber}`);
    }
  }
}

export function calculateEliminationStandings(
  allMatches: StandingsMatch[],
  participants: StandingsParticipant[],
): Map<string, EliminationStandingEntry> {
  const completedMatches = allMatches
    .filter((m) => m.status === "complete")
    .toSorted((a, b) => b.matchNumber - a.matchNumber);

  const activeMatches = allMatches.filter(
    (m) => m.status !== "complete" && m.status !== "bye" && m.status !== "unreachable",
  );

  const completedLossCount = new Map<string, number>();
  const records = new Map<string, { wins: number; losses: number }>();
  const bumpRecord = (id: string, field: "wins" | "losses") => {
    const prev = records.get(id) ?? { wins: 0, losses: 0 };
    prev[field] += 1;
    records.set(id, prev);
  };

  for (const m of allMatches) {
    if (!((m.status === "complete" || m.status === "bye") && m.winnerId)) {
      continue;
    }
    bumpRecord(m.winnerId, "wins");
    const loserId = m.player1Id === m.winnerId ? m.player2Id : m.player1Id;
    if (loserId) {
      completedLossCount.set(loserId, (completedLossCount.get(loserId) ?? 0) + 1);
      bumpRecord(loserId, "losses");
    }
  }

  const aliveIds = new Set<string>();
  const aliveMeta = new Map<string, { section: string | null; round: number; losses: number }>();

  for (const m of activeMatches) {
    for (const id of [m.player1Id, m.player2Id]) {
      if (!id) {
        continue;
      }
      aliveIds.add(id);

      const losses = completedLossCount.get(id) ?? 0;
      const candidate = {
        section: m.bracketSection,
        round: m.roundNumber,
        losses,
      };

      const prev = aliveMeta.get(id);
      if (
        !prev ||
        sectionRank(candidate.section) > sectionRank(prev.section) ||
        (sectionRank(candidate.section) === sectionRank(prev.section) &&
          candidate.round > prev.round)
      ) {
        aliveMeta.set(id, candidate);
      }
    }
  }

  const seedMap = new Map<string, number>();
  for (const p of participants) {
    if (p.seed !== null) {
      seedMap.set(p.id, p.seed);
    }
  }

  const aliveParticipants = participants
    .filter((p) => aliveIds.has(p.id))
    .toSorted((a, b) => compareAliveParticipants(a, b, aliveMeta, seedMap));

  const ordered: RankEntry[] = [];
  const seen = new Set<string>();
  const push = (id: string, group: string) => {
    if (!seen.has(id)) {
      seen.add(id);
      ordered.push({ id, group });
    }
  };

  if (aliveParticipants.length === 0) {
    buildCompletedOrder(completedMatches, push);
  } else {
    // Nothing separates alive players at the same depth
    for (const p of aliveParticipants) {
      const meta = aliveMeta.get(p.id);
      push(p.id, `alive:${meta?.section}:${meta?.round}:${meta?.losses}`);
    }
    for (const m of completedMatches) {
      if (!m.winnerId) {
        continue;
      }
      const loserId = m.player1Id === m.winnerId ? m.player2Id : m.player1Id;
      if (loserId) {
        push(loserId, `elim:${m.bracketSection}:${m.roundNumber}`);
      }
    }
  }

  // Anyone who never appeared in a match has no result to separate them.
  for (const p of participants) {
    push(p.id, "none");
  }

  return assignRanks(ordered, records);
}
