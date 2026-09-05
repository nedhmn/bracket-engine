import type { MantisRanking, MatchResult, Standing } from "../types.ts";

const MIN_OPPONENT_CONTRIBUTION = -3;

type ParticipantData = {
  id: string;
  losses: number;
  lossRounds: number[];
  opponentIds: string[];
  tb1: number;
  tb2: number;
  tb3: number;
  wins: number;
};

const processMatchResults = (matches: MatchResult[], data: Map<string, ParticipantData>) => {
  for (const match of matches) {
    if (!match.winnerId) {
      continue;
    }

    if (match.player2Id === null) {
      const p1 = data.get(match.player1Id);
      if (p1) {
        p1.wins++;
      }
      continue;
    }

    const p1 = data.get(match.player1Id);
    const p2 = data.get(match.player2Id);
    if (!(p1 && p2)) {
      continue;
    }

    p1.opponentIds.push(match.player2Id);
    p2.opponentIds.push(match.player1Id);

    if (match.winnerId === match.player1Id) {
      p1.wins++;
      p2.losses++;
      p2.lossRounds.push(match.roundNumber);
    } else if (match.winnerId === match.player2Id) {
      p2.wins++;
      p1.losses++;
      p1.lossRounds.push(match.roundNumber);
    }
  }
};

const calculateTb1 = (data: Map<string, ParticipantData>) => {
  for (const d of data.values()) {
    let sum = 0;
    for (const oppId of d.opponentIds) {
      const opp = data.get(oppId);
      if (opp) {
        sum += Math.max(opp.wins - opp.losses, MIN_OPPONENT_CONTRIBUTION);
      }
    }
    d.tb1 = sum;
  }
};

const calculateTb2 = (data: Map<string, ParticipantData>) => {
  for (const d of data.values()) {
    let sum = 0;
    for (const oppId of d.opponentIds) {
      const opp = data.get(oppId);
      if (opp) {
        sum += opp.tb1;
      }
    }
    d.tb2 = sum;
  }
};

const calculateTb3 = (data: Map<string, ParticipantData>) => {
  for (const d of data.values()) {
    d.tb3 = d.lossRounds.reduce((sum, round) => sum + round * round, 0);
  }
};

const sortByTiebreakers = (arr: ParticipantData[]) =>
  arr.toSorted((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    if (b.tb1 !== a.tb1) {
      return b.tb1 - a.tb1;
    }
    if (b.tb2 !== a.tb2) {
      return b.tb2 - a.tb2;
    }
    return b.tb3 - a.tb3;
  });

const applySwissMatchToStandings = (match: MatchResult, standings: Map<string, Standing>) => {
  if (!match.winnerId) {
    return;
  }

  if (match.player2Id === null) {
    const player = standings.get(match.player1Id);
    if (player) {
      player.wins++;
      player.byes++;
    }
    return;
  }

  const p1 = standings.get(match.player1Id);
  const p2 = standings.get(match.player2Id);
  if (!(p1 && p2)) {
    return;
  }

  p1.opponents.push(match.player2Id);
  p2.opponents.push(match.player1Id);

  if (match.winnerId === match.player1Id) {
    p1.wins++;
    p2.losses++;
    return;
  }

  if (match.winnerId === match.player2Id) {
    p2.wins++;
    p1.losses++;
  }
};

export const buildSwissStandings = (
  participants: Array<{ participantId: string; dropped: boolean }>,
  matches: MatchResult[],
): Standing[] => {
  const standings = new Map<string, Standing>();

  for (const participant of participants) {
    standings.set(participant.participantId, {
      participantId: participant.participantId,
      wins: 0,
      losses: 0,
      byes: 0,
      opponents: [],
      dropped: participant.dropped,
    });
  }

  for (const match of matches) {
    applySwissMatchToStandings(match, standings);
  }

  return participants
    .map((participant) => standings.get(participant.participantId))
    .filter((standing): standing is Standing => standing !== undefined);
};

const tieKey = (d: ParticipantData) => `${d.wins}:${d.tb1}:${d.tb2}:${d.tb3}`;

export const calculateMantisRankings = (
  participantIds: string[],
  matches: MatchResult[],
): MantisRanking[] => {
  const data = new Map<string, ParticipantData>();
  for (const id of participantIds) {
    data.set(id, {
      id,
      wins: 0,
      losses: 0,
      opponentIds: [],
      lossRounds: [],
      tb1: 0,
      tb2: 0,
      tb3: 0,
    });
  }

  processMatchResults(matches, data);
  calculateTb1(data);
  calculateTb2(data);
  calculateTb3(data);

  const sorted = sortByTiebreakers(Array.from(data.values()));

  // Competition ranking ("1224")
  let prevKey: string | null = null;
  let currentRank = 0;
  return sorted.map((d, i) => {
    const key = tieKey(d);
    if (key !== prevKey) {
      currentRank = i + 1;
      prevKey = key;
    }
    return {
      participantId: d.id,
      rank: currentRank,
      wins: d.wins,
      losses: d.losses,
      tb1: d.tb1,
      tb2: d.tb2,
      tb3: d.tb3,
    };
  });
};
