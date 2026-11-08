import { Button } from "@repo/design-system/components/button";
import { Card } from "@repo/design-system/components/card";
import { Input } from "@repo/design-system/components/input";
import { useState } from "react";
import type { GrandFinalType, PhaseFormat } from "tournament-engine";

import { positiveInt } from "../input.ts";
import { FORMATS, GRAND_FINALS } from "../lookup.ts";
import { useSession } from "../session.tsx";
import { Choice, FailureText, Field } from "./fields.tsx";

export function Setup() {
  const session = useSession();
  const [name, setName] = useState("Weekly Cup");
  const [format, setFormat] = useState<PhaseFormat>("swiss");
  const [rounds, setRounds] = useState("");
  const [grandFinal, setGrandFinal] = useState<GrandFinalType>("double");

  return (
    <Card className="max-w-[520px] p-5">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          session.create("create", () => ({
            id: crypto.randomUUID(),
            name: name.trim(),
            format,
            rounds:
              format === "swiss" && rounds.trim() !== ""
                ? positiveInt(rounds, "Swiss rounds")
                : undefined,
            grandFinalType: grandFinal,
          }));
        }}
      >
        <h2 className="text-lg">New tournament</h2>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
        </Field>
        <Field label="Format">
          <Choice label="Format" value={format} options={FORMATS} onChange={setFormat} />
        </Field>
        {format === "swiss" ? (
          <Field label="Swiss rounds">
            <Input
              value={rounds}
              onChange={(e) => setRounds(e.target.value)}
              type="number"
              min={1}
              max={20}
              step={1}
              placeholder="Auto"
            />
          </Field>
        ) : null}
        {format === "double_elimination" ? (
          <Field label="Grand final">
            <Choice
              label="Grand final"
              value={grandFinal}
              options={GRAND_FINALS}
              onChange={setGrandFinal}
            />
          </Field>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="md">
            Create
          </Button>
          <FailureText scope="create" />
        </div>
      </form>
    </Card>
  );
}
