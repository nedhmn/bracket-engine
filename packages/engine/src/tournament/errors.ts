export type TournamentErrorCode =
  | "already_dropped"
  | "already_started"
  | "bye_not_reopenable"
  | "dropped_participant"
  | "duplicate_name"
  | "invalid_seeding"
  | "join_closed"
  | "later_round_paired"
  | "match_not_complete"
  | "match_not_found"
  | "match_not_open"
  | "no_active_phase"
  | "no_phases"
  | "not_enough_participants"
  | "not_underway"
  | "participant_not_found"
  | "phase_complete"
  | "phase_not_found"
  | "swiss_not_started"
  | "swiss_rounds_left"
  | "swiss_unresolved"
  | "top_cut_needs_swiss"
  | "top_cut_too_small"
  | "tournament_complete"
  | "unresolved_matches"
  | "winner_not_in_match"
  | "winner_not_in_phase";

const MESSAGES: Record<TournamentErrorCode, string> = {
  already_dropped: "Participant has already dropped",
  already_started: "Tournament has already started",
  bye_not_reopenable: "Bye matches cannot be reopened",
  dropped_participant: "A dropped participant cannot be re-paired",
  duplicate_name: "A participant with that name has already joined",
  invalid_seeding: "Seeding must list every active participant exactly once",
  join_closed: "Participants can only join before the tournament starts",
  later_round_paired: "A later swiss round has been paired from this result",
  match_not_complete: "Only a completed match can be reopened",
  match_not_found: "Match not found",
  match_not_open: "Match is not open for reporting",
  no_active_phase: "Tournament has no active phase",
  no_phases: "Tournament has no phases",
  not_enough_participants: "At least 2 participants are required to start",
  not_underway: "Tournament must be underway to finalize",
  participant_not_found: "Participant not found",
  phase_complete: "Phase is complete; standings are published",
  phase_not_found: "Phase not found",
  swiss_not_started: "Swiss phase has not started",
  swiss_rounds_left: "Swiss phase has rounds left to play",
  swiss_unresolved: "Swiss phase has unresolved matches",
  top_cut_needs_swiss: "A top cut follows a swiss phase",
  top_cut_too_small: "A top cut needs at least 2 participants",
  tournament_complete: "Tournament is complete",
  unresolved_matches: "Matches are unresolved",
  winner_not_in_match: "Winner must be one of the match participants",
  winner_not_in_phase: "Winner is not in this phase",
};

export class TournamentError extends Error {
  override readonly name = "TournamentError";
  readonly code: TournamentErrorCode;

  constructor(code: TournamentErrorCode, message: string = MESSAGES[code]) {
    super(message);
    this.code = code;
  }
}
