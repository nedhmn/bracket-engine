import type { Tournament } from "tournament-engine";

import { esc, sortedPhases } from "./html.ts";
import { grandFinalSelect } from "./setup.ts";

function topCutForm(): string {
  return `
    <form class="inline-form wrap" data-form="topcut">
      <label class="field compact">
        <span class="field-label">Top</span>
        <input name="size" type="number" min="2" max="64" step="1" value="8" />
      </label>
      <label class="field compact">
        <span class="field-label">Format</span>
        <select name="format">
          <option value="single_elimination">Single elimination</option>
          <option value="double_elimination">Double elimination</option>
        </select>
      </label>
      ${grandFinalSelect()}
      <button class="cmd primary" type="submit">Create top cut</button>
    </form>`;
}

export function renderControls(tournament: Tournament): string {
  if (tournament.status !== "underway") {
    return "";
  }
  const active = tournament.participants
    .filter((p) => p.status === "active")
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`)
    .join("");
  const latest = sortedPhases(tournament).at(-1);
  return `
    <div class="card controls">
      <form class="inline-form" data-form="drop">
        <select name="participant" aria-label="Player to drop">${active}</select>
        <button class="cmd" type="submit">Drop player</button>
      </form>
      ${latest?.format === "swiss" ? topCutForm() : ""}
      <div class="inline-form">
        <button class="cmd danger" type="button" data-action="end">End tournament</button>
      </div>
    </div>`;
}
