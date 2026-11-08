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

const PRESET_GROUPS = [
  { label: "Single phase", presets: PRESETS.filter((p) => p.cut === null) },
  { label: "Multi-phase", presets: PRESETS.filter((p) => p.cut !== null) },
];

function PresetPicker({ onChange, value }: { onChange: (p: Preset) => void; value: Preset }) {
  return (
    <div className="grid gap-4">
      {PRESET_GROUPS.map((group) => (
        <div key={group.label} className="grid gap-1.5">
          <span className="font-code text-[11px] tracking-wider text-text-muted uppercase">
            {group.label}
          </span>
          <div className="divide-y border">
            {group.presets.map((p) => (
              <label
                key={p.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-bg-hover",
                  p.value === value && "bg-bg-hover",
                )}
              >
                <input
                  type="radio"
                  name="preset"
                  value={p.value}
                  checked={p.value === value}
                  onChange={() => onChange(p.value)}
                  className="size-3.5 shrink-0 accent-[var(--accent)]"
                />
                <span className="grid min-w-0 gap-x-3 sm:flex sm:items-baseline">
                  <span className="text-sm font-medium whitespace-nowrap">{p.label}</span>
                  <span className="text-xs text-text-secondary sm:truncate">{p.copy}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
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
        for (let seed = 1; seed <= count; seed++) {
          const current = t;
          t = call("joinTournament", { name: `Player ${seed}` }, (i) => joinTournament(current, i));
        }
        const joined = t;
        const seeding = joined.participants.map((p) => p.id);
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
        <p className="text-sm text-text-secondary">Pick a format and a player count, then start.</p>
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
          Start tournament
        </Button>
        <FailureText scope={SCOPE} />
      </div>
    </form>
  );
}
