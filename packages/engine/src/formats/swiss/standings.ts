import type { MatchResult, Standing } from "../types.ts";

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

const countFloat = (match: MatchResult, standings: Map<string, Standing>) => {
  if (match.player2Id === null) {
    return;
  }
  const p1 = standings.get(match.player1Id);
  const p2 = standings.get(match.player2Id);
  if (!(p1 && p2) || p1.wins === p2.wins) {
    return;
  }
  (p1.wins > p2.wins ? p1 : p2).floats++;
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
      floats: 0,
      opponents: [],
      dropped: participant.dropped,
    });
  }

  const rounds = [...new Set(matches.map((m) => m.roundNumber))].toSorted((a, b) => a - b);
  for (const round of rounds) {
    const roundMatches = matches.filter((m) => m.roundNumber === round);
    // Floats compare records as they stood before the round.
    for (const match of roundMatches) {
      countFloat(match, standings);
    }
    for (const match of roundMatches) {
      applySwissMatchToStandings(match, standings);
    }
  }

  return participants
    .map((participant) => standings.get(participant.participantId))
    .filter((standing): standing is Standing => standing !== undefined);
};
