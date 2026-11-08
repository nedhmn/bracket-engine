import { createContext, type ReactNode, use, useState } from "react";
import type {
  ActionResult,
  Tournament,
  TournamentErrorCode,
  TournamentEvent,
} from "tournament-engine";
import { TournamentError } from "tournament-engine";

import type { Plan } from "./plan.ts";

export type Failure = {
  code: TournamentErrorCode | null;
  message: string;
  scope: string;
};

export type Call = {
  events: TournamentEvent[];
  fn: string;
  input: string;
  withTournament: boolean;
};

export type Entry = {
  calls: Call[];
  id: number;
  title: string | null;
};

export type CallFn = <I>(fn: string, input: I, apply: (input: I) => ActionResult) => Tournament;

type Script = (call: CallFn) => void;

type Snapshot = {
  failure: Failure | null;
  log: Entry[];
  plan: Plan | null;
  tournament: Tournament | null;
};

type Session = Snapshot & {
  perform: (scope: string, title: string | null, script: Script, plan?: Plan) => boolean;
  reset: () => void;
};

const LOG_LIMIT = 100;

const SessionContext = createContext<Session | null>(null);

function toFailure(scope: string, cause: unknown): Failure {
  if (cause instanceof TournamentError) {
    return { code: cause.code, message: cause.message, scope };
  }
  const message = cause instanceof Error ? cause.message : "Something went wrong";
  return { code: null, message, scope };
}

function compact<I>(input: I): string {
  return JSON.stringify(input, null, 1).replaceAll(/\n\s*/g, " ");
}

const EMPTY: Snapshot = { failure: null, log: [], plan: null, tournament: null };

let nextEntryId = 1;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);

  const perform: Session["perform"] = (scope, title, script, plan) => {
    let current = snapshot.tournament;
    const calls: Call[] = [];
    const call: CallFn = (fn, input, apply) => {
      const withTournament = current !== null;
      const result = apply(input);
      calls.push({ events: result.events, fn, input: compact(input), withTournament });
      current = result.tournament;
      return current;
    };

    let failure: Failure | null = null;
    try {
      script(call);
    } catch (error) {
      failure = toFailure(scope, error);
    }
    // A plan marks tournament creation, which commits all or nothing
    const commit = calls.length > 0 && (plan === undefined || failure === null);
    const entry = calls.length > 0 ? [{ calls, id: nextEntryId++, title }] : [];
    setSnapshot((s) => ({
      failure,
      log: [...entry, ...s.log].slice(0, LOG_LIMIT),
      plan: commit && plan !== undefined ? plan : s.plan,
      tournament: commit ? current : s.tournament,
    }));
    return failure === null;
  };

  const session: Session = {
    ...snapshot,
    perform,
    reset: () => setSnapshot(EMPTY),
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
