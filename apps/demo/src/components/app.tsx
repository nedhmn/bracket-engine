import { Badge } from "@repo/design-system/components/badge";
import { Button } from "@repo/design-system/components/button";
import { useState } from "react";

import { isOnboarded, markOnboarded } from "../onboarded.ts";
import { useSession } from "../session.tsx";
import { Configure } from "./configure.tsx";
import { DataSheet } from "./data-sheet.tsx";
import { Onboarding, REPO_URL } from "./onboarding.tsx";
import { Watch } from "./watch.tsx";

function GitHubIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function Header({ onHelp }: { onHelp: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur-[14px]">
      <div className="mx-auto flex max-w-wide items-center gap-3 px-4 py-3 sm:px-6">
        <span className="flex min-w-0 items-center gap-2 font-code text-xs font-medium sm:text-sm">
          <span className="truncate">
            <span className="text-text-muted max-sm:hidden">nedhmn/</span>tournament-engine
          </span>
          <Badge tone="outline" mono>
            demo
          </Badge>
        </span>
        <nav className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="cursor-pointer px-1 text-sm whitespace-nowrap text-text-secondary hover:text-text-primary"
            onClick={onHelp}
          >
            How it works
          </button>
          <Button variant="ghost" className="size-8 rounded-pill p-0" asChild>
            <a href={REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub" title="GitHub">
              <GitHubIcon />
            </a>
          </Button>
        </nav>
      </div>
    </header>
  );
}

function DataPill({ onOpen }: { onOpen: () => void }) {
  const { log } = useSession();
  const events = log.reduce((n, e) => n + e.calls.reduce((m, c) => m + c.events.length, 0), 0);
  return (
    <button
      type="button"
      className="fixed right-4 bottom-4 z-30 flex cursor-pointer items-center gap-2 rounded-pill border border-border-bright bg-bg-elevated py-2 pr-2.5 pl-4 text-sm shadow-window transition-colors hover:bg-bg-hover sm:right-6 sm:bottom-6"
      aria-label={`Data, ${events} events`}
      onClick={onOpen}
    >
      <span aria-hidden="true" className="font-code text-xs text-text-muted">
        {"{ }"}
      </span>
      Data
      <span className="rounded-pill bg-bg-hover px-2 py-0.5 font-code text-xs text-text-secondary tabular-nums">
        {events}
      </span>
    </button>
  );
}

export function App() {
  const session = useSession();
  const [onboarding, setOnboarding] = useState(() => !isOnboarded());
  const [data, setData] = useState(false);

  return (
    <>
      <Header onHelp={() => setOnboarding(true)} />
      <main className="mx-auto w-full max-w-wide px-4 pt-8 pb-section-sm sm:px-6">
        {session.tournament === null ? (
          <Configure />
        ) : (
          <Watch key={session.tournament.id} tournament={session.tournament} />
        )}
      </main>
      <Onboarding
        open={onboarding}
        onOpenChange={(open) => {
          setOnboarding(open);
          if (!open) {
            markOnboarded();
          }
        }}
      />
      <DataPill onOpen={() => setData(true)} />
      <DataSheet open={data} onOpenChange={setData} />
    </>
  );
}
