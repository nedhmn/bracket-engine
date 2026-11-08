import type { ActionResult, Tournament } from "tournament-engine";
import {
  createTopCut,
  dropParticipant,
  endTournament,
  joinTournament,
  reopenResult,
  reportResult,
  startTournament,
} from "tournament-engine";

import { choice, field, positiveInt, restore, snapshot } from "./form.ts";
import { sampleNames, shuffle } from "./players.ts";
import { create, reset, run } from "./state.ts";

const FORMATS = ["swiss", "single_elimination", "double_elimination"] as const;
const ELIMINATION = ["single_elimination", "double_elimination"] as const;
const GRAND_FINALS = ["none", "simple", "double"] as const;

function attr(value: string | undefined): string {
  return value ?? "";
}

function joinAll(tournament: Tournament, names: string[]): ActionResult {
  return names.reduce<ActionResult>(
    (acc, name) => {
      const next = joinTournament(acc.tournament, { name });
      return { tournament: next.tournament, events: [...acc.events, ...next.events] };
    },
    { tournament, events: [] },
  );
}

function click(el: HTMLElement): boolean {
  const { match, winner, participant } = el.dataset;
  switch (el.dataset.action) {
    case "report":
      return run((t) => reportResult(t, { matchId: attr(match), winnerId: attr(winner) }));
    case "reopen":
      return run((t) => reopenResult(t, { matchId: attr(match) }));
    case "drop":
      return run((t) => dropParticipant(t, { participantId: attr(participant) }));
    case "start":
      return run((t) =>
        startTournament(t, {
          seeding: shuffle(t.participants.filter((p) => p.status === "active").map((p) => p.id)),
        }),
      );
    case "end":
      return run((t) => endTournament(t, { force: false }));
    case "end-force":
      return run((t) => endTournament(t, { force: true }));
    case "reset":
      reset();
      return true;
    default:
      return false;
  }
}

function submit(form: HTMLFormElement): boolean {
  switch (form.dataset.form) {
    case "create":
      return create(() => {
        const rounds = field(form, "rounds");
        return {
          id: crypto.randomUUID(),
          name: field(form, "name"),
          format: choice(field(form, "format"), FORMATS),
          rounds: rounds === "" ? undefined : positiveInt(rounds, "Swiss rounds"),
          grandFinalType: choice(field(form, "grandFinal"), GRAND_FINALS),
        };
      });
    case "join":
      return run((t) => joinTournament(t, { name: field(form, "name") }));
    case "sample":
      return run((t) =>
        joinAll(
          t,
          sampleNames(
            t.participants.map((p) => p.name),
            positiveInt(field(form, "count"), "Player count"),
          ),
        ),
      );
    case "drop":
      return run((t) => dropParticipant(t, { participantId: field(form, "participant") }));
    case "topcut":
      return run((t) =>
        createTopCut(t, {
          size: positiveInt(field(form, "size"), "Top cut size"),
          format: choice(field(form, "format"), ELIMINATION),
          grandFinalType: choice(field(form, "grandFinal"), GRAND_FINALS),
        }),
      );
    default:
      return false;
  }
}

export function wire(root: HTMLElement, render: () => void): void {
  root.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-action]") : null;
    if (target instanceof HTMLElement) {
      click(target);
      render();
    }
  });

  root.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    event.preventDefault();
    const name = form.dataset.form;
    const values = snapshot(form);
    const ok = submit(form);
    render();
    const next = root.querySelector<HTMLFormElement>(`form[data-form="${name}"]`);
    if (!next) {
      return;
    }
    if (!ok) {
      restore(next, values);
    }
    if (name === "join") {
      next.querySelector("input")?.focus();
    }
  });
}
