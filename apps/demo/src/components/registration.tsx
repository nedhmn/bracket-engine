import { Badge } from "@repo/design-system/components/badge";
import { Button } from "@repo/design-system/components/button";
import { Card } from "@repo/design-system/components/card";
import { Input } from "@repo/design-system/components/input";
import { useRef, useState } from "react";
import type { ActionResult, Tournament } from "tournament-engine";
import { dropParticipant, joinTournament, startTournament } from "tournament-engine";

import { positiveInt } from "../input.ts";
import { formatLabel, sortedPhases } from "../lookup.ts";
import { sampleNames, shuffle } from "../players.ts";
import { useSession } from "../session.tsx";
import { FailureText } from "./fields.tsx";

function joinAll(tournament: Tournament, names: string[]): ActionResult {
  return names.reduce<ActionResult>(
    (acc, name) => {
      const next = joinTournament(acc.tournament, { name });
      return { tournament: next.tournament, events: [...acc.events, ...next.events] };
    },
    { tournament, events: [] },
  );
}

export function Registration({ tournament }: { tournament: Tournament }) {
  const session = useSession();
  const [name, setName] = useState("");
  const [count, setCount] = useState("8");
  const nameRef = useRef<HTMLInputElement>(null);
  const first = sortedPhases(tournament)[0];
  const rounds = first?.format === "swiss" ? `, ${first.rounds ?? "auto"} rounds` : "";

  return (
    <Card className="grid gap-5 p-5">
      <div className="grid gap-1.5">
        <h2 className="flex items-center gap-2 text-lg">
          Players <Badge mono>{tournament.participants.length}</Badge>
        </h2>
        <p className="text-sm text-text-secondary">
          {first ? formatLabel(first.format) : ""}
          {rounds}. Add players, then start. Seeding is shuffled.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <form
          className="grid gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (session.run("join", (t) => joinTournament(t, { name: name.trim() }))) {
              setName("");
            }
            nameRef.current?.focus();
          }}
        >
          <div className="flex gap-2">
            <Input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Player name"
              aria-label="Player name"
              maxLength={40}
              autoComplete="off"
              required
            />
            <Button type="submit" variant="outline" size="md">
              Add
            </Button>
          </div>
          <FailureText scope="join" />
        </form>
        <form
          className="grid gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            session.run("sample", (t) =>
              joinAll(
                t,
                sampleNames(
                  t.participants.map((p) => p.name),
                  positiveInt(count, "Player count"),
                ),
              ),
            );
          }}
        >
          <div className="flex gap-2">
            <Input
              value={count}
              onChange={(e) => setCount(e.target.value)}
              type="number"
              min={1}
              max={64}
              step={1}
              aria-label="Sample player count"
              className="w-20 shrink-0"
            />
            <Button type="submit" variant="outline" size="md">
              Add sample players
            </Button>
          </div>
          <FailureText scope="sample" />
        </form>
      </div>

      <div className="grid gap-1.5">
        {tournament.participants.length === 0 ? (
          <p className="text-sm text-text-muted">No players yet</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {tournament.participants.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-1 rounded-md border border-border-bright bg-bg py-0.5 pr-0.5 pl-2.5 text-sm"
              >
                <span>{p.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${p.name}`}
                  title={`Remove ${p.name}`}
                  className="cursor-pointer rounded-sm px-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                  onClick={() =>
                    session.run("remove", (t) => dropParticipant(t, { participantId: p.id }))
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <FailureText scope="remove" />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button
          size="md"
          onClick={() =>
            session.run("start", (t) =>
              startTournament(t, {
                seeding: shuffle(
                  t.participants.filter((p) => p.status === "active").map((p) => p.id),
                ),
              }),
            )
          }
        >
          Start
        </Button>
        <FailureText scope="start" />
      </div>
    </Card>
  );
}
