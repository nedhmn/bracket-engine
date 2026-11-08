import type {
  BracketMatchStatus,
  BracketSection,
  GrandFinalType,
  MatchSlot,
} from "../formats/types.ts";

export type TournamentStatus = "pending" | "underway" | "complete";
export type PhaseFormat = "swiss" | "single_elimination" | "double_elimination";
export type EliminationFormat = Exclude<PhaseFormat, "swiss">;
export type PhaseStatus = "pending" | "underway" | "complete";
export type ParticipantStatus = "active" | "dropped";
export type MatchStatus = BracketMatchStatus;

export type Participant = {
  finalStanding: number | null;
  id: string;
  name: string;
  status: ParticipantStatus;
};

export type Phase = {
  currentRound: number | null;
  format: PhaseFormat;
  grandFinalType: GrandFinalType | null;
  id: string;
  position: number;
  rounds: number | null;
  status: PhaseStatus;
};

export type PhaseParticipant = {
  finalStanding: number | null;
  participantId: string;
  phaseId: string;
  seed: number;
};

export type Match = {
  bracketSection: BracketSection | null;
  forfeit: boolean;
  id: string;
  loserNextMatchId: string | null;
  loserNextMatchSlot: MatchSlot | null;
  matchNumber: number;
  nextMatchId: string | null;
  nextMatchSlot: MatchSlot | null;
  phaseId: string;
  player1Id: string | null;
  player2Id: string | null;
  roundNumber: number;
  status: MatchStatus;
  winnerId: string | null;
};

export type Tournament = {
  id: string;
  matches: Match[];
  name: string;
  participantSequence: number;
  participants: Participant[];
  phaseParticipants: PhaseParticipant[];
  phases: Phase[];
  status: TournamentStatus;
};

export type TournamentEvent =
  | { type: "tournament_created"; tournamentId: string }
  | { type: "tournament_started"; tournamentId: string }
  | { type: "tournament_completed"; tournamentId: string }
  | { type: "participant_joined"; participantId: string }
  | { type: "participant_removed"; participantId: string }
  | { type: "participant_dropped"; participantId: string }
  | { type: "phase_started"; phaseId: string }
  | { type: "phase_completed"; phaseId: string }
  | { type: "swiss_round_paired"; phaseId: string; roundNumber: number }
  | { type: "match_opened"; matchId: string }
  | { type: "match_reported"; forfeit: boolean; matchId: string; winnerId: string }
  | { type: "match_reopened"; matchId: string };

export type ActionResult = {
  events: TournamentEvent[];
  tournament: Tournament;
};
