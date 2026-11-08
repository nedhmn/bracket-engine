import { Button } from "@repo/design-system/components/button";
import { Code, CodeBlock } from "@repo/design-system/components/code";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/design-system/components/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design-system/components/tabs";
import { useState } from "react";
import type { Tournament, TournamentEvent } from "tournament-engine";

import { nameOf } from "../lookup.ts";
import { type Call, type Entry, useSession } from "../session.tsx";

function describe(tournament: Tournament | null, event: TournamentEvent): string {
  const name = (id: string) => (tournament === null ? id : nameOf(tournament, id));
  switch (event.type) {
    case "tournament_created":
      return "Tournament created";
    case "tournament_started":
      return "Tournament started";
    case "tournament_completed":
      return "Tournament complete";
    case "participant_joined":
      return `${name(event.participantId)} joined`;
    case "participant_removed":
      return `${event.participantId} removed`;
    case "participant_dropped":
      return `${name(event.participantId)} dropped`;
    case "phase_started":
      return `${event.phaseId} started`;
    case "phase_completed":
      return `${event.phaseId} complete`;
    case "swiss_round_paired":
      return `Round ${event.roundNumber} paired`;
    case "match_opened":
      return `${event.matchId} open`;
    case "match_reported":
      return `${event.matchId}: ${name(event.winnerId)} wins${event.forfeit ? " by forfeit" : ""}`;
    case "match_reopened":
      return `${event.matchId} reopened`;
  }
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function Empty({ children }: { children: string }) {
  return <p className="px-4 py-6 text-sm text-text-muted">{children}</p>;
}

function CallView({ call }: { call: Call }) {
  return (
    <div className="grid gap-2">
      <pre className="font-code text-xs break-words whitespace-pre-wrap text-text-primary">
        <span className="font-medium text-accent">{call.fn}</span>(
        {call.withTournament ? "t, " : ""}
        {call.input})
      </pre>
      <div className="flex flex-wrap gap-1.5">
        {call.events.map((e, i) => (
          // Events carry no id and one call can emit the same type twice
          <Code key={i} className="text-[11px]">
            {e.type}
          </Code>
        ))}
      </div>
    </div>
  );
}

function EntryView({ entry }: { entry: Entry }) {
  const [first] = entry.calls;
  if (entry.title === null && entry.calls.length === 1 && first !== undefined) {
    return <CallView call={first} />;
  }
  const events = entry.calls.reduce((n, c) => n + c.events.length, 0);
  return (
    <details className="group grid">
      <summary className="cursor-pointer text-sm marker:text-text-faint">
        <span className="font-medium">{entry.title ?? first?.fn}</span>
        <span className="text-text-muted">
          {" "}
          · {count(entry.calls.length, "call")} · {count(events, "event")}
        </span>
      </summary>
      <ol className="mt-3 grid gap-3 border-l pl-3">
        {entry.calls.map((c, i) => (
          // Calls in one batch are append-only and never reorder
          <li key={i}>
            <CallView call={c} />
          </li>
        ))}
      </ol>
    </details>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      onClick={() => {
        navigator.clipboard.writeText(text).then(
          () => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          },
          () => setCopied(false),
        );
      }}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function DataSheet({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const { log, tournament } = useSession();
  const events = log.flatMap((entry) =>
    entry.calls.toReversed().flatMap((c) => c.events.toReversed()),
  );
  const state = tournament === null ? "" : JSON.stringify(tournament, null, 2);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Data</SheetTitle>
          <SheetDescription>What the engine saw and returned, newest first.</SheetDescription>
        </SheetHeader>
        <Tabs defaultValue="calls" className="min-h-0 flex-1 gap-0">
          <div className="border-b px-4 py-3">
            <TabsList>
              <TabsTrigger value="calls">Calls</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="state">State</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="calls" className="min-h-0 flex-1 overflow-y-auto">
            {log.length === 0 ? (
              <Empty>No calls yet. Create a tournament or report a match.</Empty>
            ) : (
              <ol className="divide-y">
                {log.map((entry) => (
                  <li key={entry.id} className="px-4 py-3.5">
                    <EntryView entry={entry} />
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>
          <TabsContent value="events" className="min-h-0 flex-1 overflow-y-auto">
            {events.length === 0 ? (
              <Empty>No events yet.</Empty>
            ) : (
              <ol className="divide-y">
                {events.map((e, i) => (
                  // Events carry no id; the list only ever grows at the top
                  <li key={events.length - i} className="grid gap-1 px-4 py-2.5">
                    <Code className="justify-self-start text-xs">{e.type}</Code>
                    <span className="text-sm text-text-secondary">{describe(tournament, e)}</span>
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>
          <TabsContent value="state" className="grid min-h-0 flex-1 grid-rows-[auto_1fr]">
            {tournament === null ? (
              <Empty>No tournament yet.</Empty>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="font-code text-xs text-text-muted">Tournament</span>
                  <CopyButton text={state} />
                </div>
                <CodeBlock className="mx-4 mb-4 min-h-0 overflow-auto text-xs">{state}</CodeBlock>
              </>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
