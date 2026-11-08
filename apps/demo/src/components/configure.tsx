import { Button } from "@repo/design-system/components/button";
import { Input } from "@repo/design-system/components/input";
import { cn } from "@repo/design-system/lib/utils";
import { type ReactNode, useState } from "react";
import type { CreateTournamentInput, GrandFinalType } from "tournament-engine";
import { createTournament, joinTournament, startTournament } from "tournament-engine";

import {
  GRAND_FINALS,
  type Plan,
  PLAYER_PICKS,
  planName,
  type Preset,
  PRESETS,
  presetInfo,
  TOP_CUTS,
  usesGrandFinal,
} from "../plan.ts";
import { sampleNames, shuffle } from "../players.ts";
import { useSession } from "../session.tsx";
import { FailureText } from "./match.tsx";
import { Segmented } from "./segmented.tsx";

const MAX_PLAYERS = 128;
const SCOPE = "create";

function Group({ children, label }: { children: ReactNode; label: string }) {
  return (
    <fieldset className="grid gap-2.5">
      <legend className="mb-2.5 text-sm font-medium">{label}</legend>
      {children}
    </fieldset>
  );
}

function PresetPicker({ onChange, value }: { onChange: (p: Preset) => void; value: Preset }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {PRESETS.map((p) => (
        <label
          key={p.value}
          className={cn(
            "grid cursor-pointer content-start gap-1 rounded-lg border p-3.5 transition-colors hover:bg-bg-hover has-focus-visible:ring-[3px] has-focus-visible:ring-accent-bg-strong",
            p.value === value && "border-ink bg-bg-hover",
            p.value === "swiss" && "sm:col-span-2",
          )}
        >
          <input
            type="radio"
            name="preset"
            value={p.value}
            checked={p.value === value}
            onChange={() => onChange(p.value)}
            className="sr-only"
          />
          <span className="text-sm font-medium">{p.label}</span>
          <span className="text-xs text-text-secondary">{p.copy}</span>
        </label>
      ))}
    </div>
  );
}

export function Configure() {
  const session = useSession();
  const [preset, setPreset] = useState<Preset>("swiss_single");
  const [players, setPlayers] = useState("8");
  const [grandFinal, setGrandFinal] = useState<GrandFinalType>("double");
  const [topCut, setTopCut] = useState(8);

  const count = Number(players);
  const valid = Number.isInteger(count) && count >= 1 && count <= MAX_PLAYERS;
  const info = presetInfo(preset);
  const cuts = TOP_CUTS.filter((size) => !valid || size <= count);
  const cut = cuts.includes(topCut) ? topCut : (cuts.at(-1) ?? null);
  const ready = valid && (info.cut === null || cut !== null);

  const create = () => {
    const plan: Plan = { preset, players: count, grandFinal, topCut: cut ?? 0 };
    const input: CreateTournamentInput = {
      id: crypto.randomUUID(),
      name: planName(plan),
      format: info.format,
    };
    if (info.format === "double_elimination") {
      input.grandFinalType = grandFinal;
    }
    session.perform(
      SCOPE,
      "Create tournament",
      (call) => {
        let t = call("createTournament", input, createTournament);
        for (const name of sampleNames([], count)) {
          const current = t;
          t = call("joinTournament", { name }, (i) => joinTournament(current, i));
        }
        const joined = t;
        const seeding = shuffle(joined.participants.map((p) => p.id));
        call("startTournament", { seeding }, (i) => startTournament(joined, i));
      },
      plan,
    );
  };

  return (
    <form
      className="mx-auto grid w-full max-w-xl gap-7 rounded-xl border bg-bg-elevated p-5 sm:p-7"
      onSubmit={(e) => {
        e.preventDefault();
        create();
      }}
    >
      <div className="grid gap-1">
        <h1 className="text-lg leading-tight font-medium">New tournament</h1>
        <p className="text-sm text-text-secondary">Pick a format and a player count.</p>
      </div>
      <Group label="Format">
        <PresetPicker value={preset} onChange={setPreset} />
      </Group>
      <Group label="Players">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="number"
            inputMode="numeric"
            aria-label="Players"
            min={1}
            max={MAX_PLAYERS}
            value={players}
            onChange={(e) => setPlayers(e.target.value)}
            className="w-24"
          />
          <Segmented
            label="Quick picks"
            value={valid ? count : null}
            onChange={(n) => setPlayers(String(n))}
            options={PLAYER_PICKS.map((n) => ({ value: n, label: String(n) }))}
          />
        </div>
      </Group>
      {info.cut === null ? null : (
        <Group label="Top cut">
          <Segmented
            label="Top cut"
            value={cut}
            onChange={setTopCut}
            options={TOP_CUTS.map((size) => ({
              value: size,
              label: `Top ${size}`,
              disabled: !cuts.includes(size),
            }))}
          />
        </Group>
      )}
      {usesGrandFinal(preset) ? (
        <Group label="Grand final">
          <Segmented
            label="Grand final"
            value={grandFinal}
            onChange={setGrandFinal}
            options={GRAND_FINALS.map(([value, label]) => ({ value, label }))}
          />
        </Group>
      ) : null}
      <div className="grid gap-2 border-t pt-5">
        <Button type="submit" size="md" disabled={!ready} className="justify-self-start">
          Create tournament
        </Button>
        <FailureText scope={SCOPE} />
      </div>
    </form>
  );
}
