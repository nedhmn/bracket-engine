import { Button } from "@repo/design-system/components/button";
import { Card } from "@repo/design-system/components/card";
import { Input } from "@repo/design-system/components/input";
import { useState } from "react";
import type { EliminationFormat, GrandFinalType, Tournament } from "tournament-engine";
import { createTopCut, dropParticipant, endTournament } from "tournament-engine";

import { positiveInt } from "../input.ts";
import { ELIMINATION_FORMATS, GRAND_FINALS, sortedPhases } from "../lookup.ts";
import { useSession } from "../session.tsx";
import { Choice, FailureText, Field } from "./fields.tsx";

function DropForm({ tournament }: { tournament: Tournament }) {
  const session = useSession();
  const active = tournament.participants
    .filter((p) => p.status === "active")
    .toSorted((a, b) => a.name.localeCompare(b.name));
  const [picked, setPicked] = useState("");
  const current = active.some((p) => p.id === picked) ? picked : (active[0]?.id ?? "");

  return (
    <form
      className="grid content-start gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        session.run("drop", (t) => dropParticipant(t, { participantId: current }));
      }}
    >
      <span className="text-xs text-text-muted">Drop a player</span>
      <div className="flex gap-2">
        <Choice
          label="Player to drop"
          value={current}
          options={active.map((p) => [p.id, p.name] as const)}
          onChange={setPicked}
        />
        <Button type="submit" variant="outline" size="md">
          Drop
        </Button>
      </div>
      <FailureText scope="drop" />
    </form>
  );
}

function TopCutForm() {
  const session = useSession();
  const [size, setSize] = useState("8");
  const [format, setFormat] = useState<EliminationFormat>("single_elimination");
  const [grandFinal, setGrandFinal] = useState<GrandFinalType>("double");

  return (
    <form
      className="grid content-start gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        session.run("topcut", (t) =>
          createTopCut(t, {
            size: positiveInt(size, "Top cut size"),
            format,
            grandFinalType: grandFinal,
          }),
        );
      }}
    >
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Top" className="w-20">
          <Input
            value={size}
            onChange={(e) => setSize(e.target.value)}
            type="number"
            min={2}
            max={64}
            step={1}
          />
        </Field>
        <Field label="Format" className="min-w-44 flex-1">
          <Choice
            label="Top cut format"
            value={format}
            options={ELIMINATION_FORMATS}
            onChange={setFormat}
          />
        </Field>
        {format === "double_elimination" ? (
          <Field label="Grand final" className="min-w-44 flex-1">
            <Choice
              label="Top cut grand final"
              value={grandFinal}
              options={GRAND_FINALS}
              onChange={setGrandFinal}
            />
          </Field>
        ) : null}
        <Button type="submit" size="md">
          Create top cut
        </Button>
      </div>
      <FailureText scope="topcut" />
    </form>
  );
}

function EndControl() {
  const session = useSession();
  const { failure } = session;
  // The engine's unresolved_matches message names the CLI's --force flag
  const unresolved = failure?.scope === "end" && failure.code === "unresolved_matches";

  return (
    <div className="grid content-start gap-2">
      <span className="text-xs text-text-muted">Finish</span>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="md"
          className="text-error"
          onClick={() => session.run("end", (t) => endTournament(t, { force: false }))}
        >
          End tournament
        </Button>
        {unresolved ? (
          <Button
            variant="outline"
            size="md"
            className="border-error text-error"
            onClick={() => session.run("end", (t) => endTournament(t, { force: true }))}
          >
            Force end
          </Button>
        ) : null}
      </div>
      {unresolved ? (
        <p role="alert" className="text-xs text-error">
          Some matches are unresolved. Finish them, or force end with standings as they are now.
        </p>
      ) : (
        <FailureText scope="end" />
      )}
    </div>
  );
}

export function Controls({ tournament }: { tournament: Tournament }) {
  const latest = sortedPhases(tournament).at(-1);

  return (
    <Card className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto]">
      <DropForm tournament={tournament} />
      {latest?.format === "swiss" ? <TopCutForm /> : <div className="hidden md:block" />}
      <EndControl />
    </Card>
  );
}
