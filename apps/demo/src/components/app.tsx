import { Badge } from "@repo/design-system/components/badge";
import { Button } from "@repo/design-system/components/button";
import type { Tournament } from "tournament-engine";

import { sortedPhases } from "../lookup.ts";
import { useSession } from "../session.tsx";
import { Controls } from "./controls.tsx";
import { EventLog } from "./events.tsx";
import { PhaseView } from "./phase.tsx";
import { Registration } from "./registration.tsx";
import { Setup } from "./setup.tsx";
import { FinalStandings } from "./standings.tsx";
import { StatusBadge } from "./status-badge.tsx";
import { ThemeToggle } from "./theme-toggle.tsx";

function Header() {
  const session = useSession();

  return (
    <header className="sticky top-0 z-20 border-b bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur-[14px]">
      <div className="mx-auto flex max-w-layout items-center gap-2 px-4 py-3 sm:px-5">
        <span className="flex min-w-0 items-center gap-2 font-code text-xs font-medium sm:text-sm">
          <span className="truncate">tournament-engine</span>
          <Badge tone="accent" mono>
            demo
          </Badge>
        </span>
        <nav className="ml-auto flex items-center gap-1">
          {session.tournament ? (
            <Button variant="ghost" className="rounded-pill text-error" onClick={session.reset}>
              Reset
            </Button>
          ) : null}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

function Running({ tournament }: { tournament: Tournament }) {
  const phases = sortedPhases(tournament)
    .filter((p) => p.status !== "pending")
    .toReversed();

  return (
    <>
      <FinalStandings tournament={tournament} />
      {tournament.status === "underway" ? <Controls tournament={tournament} /> : null}
      {phases.map((p) => (
        <PhaseView key={p.id} phase={p} tournament={tournament} />
      ))}
    </>
  );
}

function Content({ tournament }: { tournament: Tournament | null }) {
  if (tournament === null) {
    return <Setup />;
  }
  if (tournament.status === "pending") {
    return <Registration tournament={tournament} />;
  }
  return <Running tournament={tournament} />;
}

export function App() {
  const { events, tournament } = useSession();

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto grid w-full max-w-layout min-w-0 flex-1 content-start gap-6 px-4 pt-8 pb-section-sm sm:px-5">
        <div className="grid gap-2">
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xl break-words">
            {tournament?.name ?? "Run a tournament"}
            {tournament ? <StatusBadge status={tournament.status} /> : null}
          </h1>
          {tournament ? null : (
            <p className="max-w-[56ch] text-sm text-text-secondary">
              Swiss or elimination, run entirely in your browser on tournament-engine. State is
              saved to this browser.
            </p>
          )}
        </div>
        <Content tournament={tournament} />
        <EventLog events={events} tournament={tournament} />
      </main>
    </div>
  );
}
