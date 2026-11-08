import { calculateEliminationStandings } from "../formats/elimination/standings.ts";
import { calculateMantisRankings } from "../formats/swiss/tiebreakers.ts";
import type { MantisRanking } from "../formats/types.ts";
import { findPhase, phaseMatches, phaseSeeds } from "./state.ts";
import { swissResults } from "./swiss.ts";
import type { Tournament } from "./types.ts";

export type PhaseStanding = {
  participantId: string;
  rank: number;
};

export function swissRankings(tournament: Tournament, phaseId: string): MantisRanking[] {
  return calculateMantisRankings(
    phaseSeeds(tournament, phaseId).map((s) => s.participantId),
    swissResults(tournament, phaseId),
  );
}

export function phaseStandings(tournament: Tournament, phaseId: string): PhaseStanding[] {
  if (findPhase(tournament, phaseId).format === "swiss") {
    return swissRankings(tournament, phaseId).map((r) => ({
      participantId: r.participantId,
      rank: r.rank,
    }));
  }
  const seeds = phaseSeeds(tournament, phaseId);
  const entries = calculateEliminationStandings(
    phaseMatches(tournament, phaseId),
    seeds.map((s) => ({ id: s.participantId, seed: s.seed })),
  );
  return seeds
    .flatMap((s) => {
      const entry = entries.get(s.participantId);
      return entry ? [{ participantId: s.participantId, rank: entry.rank }] : [];
    })
    .toSorted((a, b) => a.rank - b.rank);
}

export function finalizePhase(tournament: Tournament, phaseId: string): void {
  for (const standing of phaseStandings(tournament, phaseId)) {
    const row = tournament.phaseParticipants.find(
      (p) => p.phaseId === phaseId && p.participantId === standing.participantId,
    );
    if (row) {
      row.finalStanding = standing.rank;
    }
  }
}

// Latest phase first: a top cut outranks the field it was cut from
export function finalizeTournament(tournament: Tournament): void {
  const tournamentRank = new Map<string, number>();
  let offset = 0;

  for (const phase of tournament.phases.toSorted((a, b) => b.position - a.position)) {
    const unplaced = tournament.phaseParticipants
      .flatMap((r) =>
        r.phaseId !== phase.id || r.finalStanding === null || tournamentRank.has(r.participantId)
          ? []
          : [{ participantId: r.participantId, standing: r.finalStanding }],
      )
      .toSorted(
        (a, b) => a.standing - b.standing || a.participantId.localeCompare(b.participantId),
      );

    let prev: number | null = null;
    let rank = offset;
    unplaced.forEach((row, index) => {
      if (row.standing !== prev) {
        rank = offset + index + 1;
        prev = row.standing;
      }
      tournamentRank.set(row.participantId, rank);
    });
    offset += unplaced.length;
  }

  for (const participant of tournament.participants) {
    const rank = tournamentRank.get(participant.id);
    if (rank !== undefined) {
      participant.finalStanding = rank;
    }
  }
}
