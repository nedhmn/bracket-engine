import type { Tournament } from "tournament-engine";

import { esc, formatLabel, sortedPhases } from "./html.ts";

export function renderRegistration(tournament: Tournament): string {
  const players = tournament.participants
    .map(
      (p) => `
        <li class="player">
          <span class="player-name">${esc(p.name)}</span>
          <button class="icon-btn" type="button" data-action="drop" data-participant="${esc(p.id)}" aria-label="Remove ${esc(p.name)}">Remove</button>
        </li>`,
    )
    .join("");
  const first = sortedPhases(tournament)[0];
  const rounds = first?.format === "swiss" ? `, ${first.rounds ?? "auto"} rounds` : "";
  return `
    <div class="card">
      <h2 class="card-title">Players <span class="count">${tournament.participants.length}</span></h2>
      <p class="muted">${esc(first ? formatLabel(first.format) : "")}${esc(rounds)}. Add players, then start. Seeding is shuffled.</p>
      <form class="inline-form" data-form="join">
        <input name="name" type="text" placeholder="Player name" maxlength="40" required autocomplete="off" />
        <button class="cmd" type="submit">Add</button>
      </form>
      <form class="inline-form" data-form="sample">
        <input name="count" type="number" min="1" max="64" step="1" value="8" aria-label="Sample player count" />
        <button class="cmd" type="submit">Add sample players</button>
      </form>
      <ul class="player-list">${players || '<li class="muted">No players yet</li>'}</ul>
      <div class="form-actions">
        <button class="cmd primary" type="button" data-action="start">Start</button>
      </div>
    </div>`;
}
