import type { Phase, Tournament } from "tournament-engine";

import type { AppState } from "../state.ts";
import { renderBracket } from "./bracket.ts";
import { renderControls } from "./controls.ts";
import { renderEvents } from "./events.ts";
import { esc, formatLabel, sortedPhases } from "./html.ts";
import { renderRegistration } from "./players.ts";
import { renderSetup } from "./setup.ts";
import { renderFinalStandings, renderPhaseStandings } from "./standings.ts";
import { renderSwiss } from "./swiss.ts";

function header(tournament: Tournament | null): string {
  const status = tournament
    ? `<span class="title">${esc(tournament.name)}</span><span class="status ${tournament.status}">${tournament.status}</span>`
    : '<span class="status">no tournament</span>';
  return `
    <header class="header">
      <div class="logo">tournament-engine <span>demo</span></div>
      <div class="header-status">${status}</div>
      ${tournament ? '<button class="cmd danger" type="button" data-action="reset">Reset</button>' : ""}
    </header>`;
}

function notice(state: AppState): string {
  if (state.error === null) {
    return "";
  }
  // The engine's unresolved_matches message names the CLI's --force flag
  if (state.error.code === "unresolved_matches") {
    return `<div class="notice" role="alert"><span>Some matches are unresolved. Finish them, or force end with standings as they are now.</span><button class="cmd danger" type="button" data-action="end-force">Force end</button></div>`;
  }
  return `<div class="notice" role="alert"><span>${esc(state.error.message)}</span></div>`;
}

function phaseBanner(phase: Phase): string {
  const round =
    phase.format === "swiss" && phase.currentRound !== null
      ? ` · round ${phase.currentRound} of ${phase.rounds ?? "?"}`
      : "";
  return `<div class="phase-banner ${phase.status === "underway" ? "active" : ""}">Phase ${phase.position} · ${esc(formatLabel(phase.format))}${round} · ${phase.status}</div>`;
}

function phaseView(tournament: Tournament, phase: Phase): string {
  const body =
    phase.format === "swiss" ? renderSwiss(tournament, phase) : renderBracket(tournament, phase);
  return `
    <section class="phase ${phase.format === "swiss" ? "swiss" : "elimination"}">
      ${phaseBanner(phase)}
      <div class="phase-body">
        <div class="phase-matches">${body}</div>
        <div class="phase-standings">${renderPhaseStandings(tournament, phase)}</div>
      </div>
    </section>`;
}

function content(tournament: Tournament | null): string {
  if (tournament === null) {
    return renderSetup();
  }
  if (tournament.status === "pending") {
    return renderRegistration(tournament);
  }
  const phases = sortedPhases(tournament)
    .filter((p) => p.status !== "pending")
    .toReversed()
    .map((p) => phaseView(tournament, p))
    .join("");
  return `${renderFinalStandings(tournament)}${renderControls(tournament)}${phases}`;
}

export function renderApp(state: AppState): string {
  return `
    ${header(state.tournament)}
    <main class="main">
      ${notice(state)}
      ${content(state.tournament)}
      ${renderEvents(state.tournament, state.events)}
    </main>`;
}
