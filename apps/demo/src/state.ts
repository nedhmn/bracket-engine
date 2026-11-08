import type {
  ActionResult,
  CreateTournamentInput,
  Tournament,
  TournamentErrorCode,
  TournamentEvent,
} from "tournament-engine";
import { createTournament, TournamentError } from "tournament-engine";

import { clearTournament, loadTournament, saveTournament } from "./storage.ts";

export type Notice = {
  code: TournamentErrorCode | null;
  message: string;
};

export type AppState = {
  error: Notice | null;
  events: TournamentEvent[];
  tournament: Tournament | null;
};

export const state: AppState = {
  error: null,
  events: [],
  tournament: loadTournament(),
};

function toNotice(cause: unknown): Notice {
  if (cause instanceof TournamentError) {
    return { code: cause.code, message: cause.message };
  }
  return { code: null, message: cause instanceof Error ? cause.message : "Something went wrong" };
}

function commit(result: ActionResult): void {
  state.tournament = result.tournament;
  state.events = result.events;
  state.error = null;
  saveTournament(result.tournament);
}

export function create(input: () => CreateTournamentInput): boolean {
  try {
    commit(createTournament(input()));
    return true;
  } catch (error) {
    state.error = toNotice(error);
    return false;
  }
}

export function run(action: (tournament: Tournament) => ActionResult): boolean {
  if (state.tournament === null) {
    return false;
  }
  try {
    commit(action(state.tournament));
    return true;
  } catch (error) {
    state.error = toNotice(error);
    return false;
  }
}

export function reset(): void {
  clearTournament();
  state.tournament = null;
  state.events = [];
  state.error = null;
}
