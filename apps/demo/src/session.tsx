import { createContext, type ReactNode, use, useState } from "react";
import type {
  ActionResult,
  CreateTournamentInput,
  Tournament,
  TournamentErrorCode,
  TournamentEvent,
} from "tournament-engine";
import { createTournament, TournamentError } from "tournament-engine";

import { clearTournament, loadTournament, saveTournament } from "./storage.ts";

export type Failure = {
  code: TournamentErrorCode | null;
  message: string;
  scope: string;
};

type Snapshot = {
  events: TournamentEvent[];
  failure: Failure | null;
  tournament: Tournament | null;
};

type Session = Snapshot & {
  create: (scope: string, input: () => CreateTournamentInput) => boolean;
  reset: () => void;
  run: (scope: string, action: (tournament: Tournament) => ActionResult) => boolean;
};

const SessionContext = createContext<Session | null>(null);

function toFailure(scope: string, cause: unknown): Failure {
  if (cause instanceof TournamentError) {
    return { code: cause.code, message: cause.message, scope };
  }
  const message = cause instanceof Error ? cause.message : "Something went wrong";
  return { code: null, message, scope };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({
    events: [],
    failure: null,
    tournament: loadTournament(),
  }));

  const attempt = (scope: string, produce: () => ActionResult): boolean => {
    try {
      const result = produce();
      saveTournament(result.tournament);
      setSnapshot({ events: result.events, failure: null, tournament: result.tournament });
      return true;
    } catch (error) {
      setSnapshot((s) => ({ ...s, failure: toFailure(scope, error) }));
      return false;
    }
  };

  const session: Session = {
    ...snapshot,
    create: (scope, input) => attempt(scope, () => createTournament(input())),
    reset: () => {
      clearTournament();
      setSnapshot({ events: [], failure: null, tournament: null });
    },
    run: (scope, action) => {
      const { tournament } = snapshot;
      return tournament !== null && attempt(scope, () => action(tournament));
    },
  };

  return <SessionContext value={session}>{children}</SessionContext>;
}

export function useSession(): Session {
  const session = use(SessionContext);
  if (session === null) {
    throw new Error("useSession needs a SessionProvider");
  }
  return session;
}
