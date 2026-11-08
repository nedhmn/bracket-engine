import type { BracketSection, Match, Phase, Tournament } from "tournament-engine";

import { esc, isLive, nameOf, phaseMatches } from "./html.ts";

const SECTION_LABELS: ReadonlyMap<BracketSection, string> = new Map([
  ["winners", "Winners bracket"],
  ["losers", "Losers bracket"],
  ["grand_final", "Grand final"],
]);

function slot(
  tournament: Tournament,
  match: Match,
  id: string | null,
  seeds: Map<string, number>,
  live: boolean,
): string {
  if (id === null) {
    const label = match.status === "bye" || match.status === "complete" ? "BYE" : "TBD";
    return `<div class="slot empty"><span class="seed-name">${label}</span></div>`;
  }
  const state = match.winnerId === null ? "" : match.winnerId === id ? "winner" : "loser";
  const body = `<span class="seed-name">${esc(nameOf(tournament, id))}</span><span class="seed-num">${esc(seeds.get(id) ?? "")}</span>`;
  if (live && match.status === "open") {
    return `<button class="slot clickable" type="button" data-action="report" data-match="${esc(match.id)}" data-winner="${esc(id)}">${body}</button>`;
  }
  return `<div class="slot ${state}">${body}</div>`;
}

const CARD_CLASSES: Record<Match["status"], string> = {
  open: "playable",
  complete: "completed",
  bye: "bye",
  unreachable: "bye",
  pending: "",
};

function cardTag(match: Match, live: boolean): string {
  if (live && match.status === "complete") {
    return `<button class="reopen" type="button" data-action="reopen" data-match="${esc(match.id)}">Reopen</button>`;
  }
  if (match.forfeit) {
    return '<span class="tag">forfeit</span>';
  }
  return match.status === "unreachable" ? '<span class="tag">not needed</span>' : "";
}

function card(
  tournament: Tournament,
  match: Match,
  seeds: Map<string, number>,
  live: boolean,
): string {
  return `
    <div class="match ${CARD_CLASSES[match.status]}" data-match-id="${esc(match.id)}">
      <div class="match-id"><span>M${match.matchNumber}</span>${cardTag(match, live)}</div>
      ${slot(tournament, match, match.player1Id, seeds, live)}
      ${slot(tournament, match, match.player2Id, seeds, live)}
    </div>`;
}

function rounds(
  tournament: Tournament,
  matches: Match[],
  seeds: Map<string, number>,
  live: boolean,
): string {
  const byRound = new Map<number, Match[]>();
  for (const m of matches) {
    byRound.set(m.roundNumber, [...(byRound.get(m.roundNumber) ?? []), m]);
  }
  const columns = [...byRound]
    .map(
      ([round, list]) => `
        <div class="round">
          <div class="round-label">Round ${round}</div>
          <div class="round-matches">${list.map((m) => card(tournament, m, seeds, live)).join("")}</div>
        </div>`,
    )
    .join("");
  return `<div class="bracket">${columns}</div>`;
}

export function renderBracket(tournament: Tournament, phase: Phase): string {
  const live = isLive(tournament, phase);
  const seeds = new Map(
    tournament.phaseParticipants
      .filter((p) => p.phaseId === phase.id)
      .map((p) => [p.participantId, p.seed]),
  );
  const matches = phaseMatches(tournament, phase.id);
  const sections = new Map<BracketSection | null, Match[]>();
  for (const m of matches) {
    sections.set(m.bracketSection, [...(sections.get(m.bracketSection) ?? []), m]);
  }
  if (phase.format === "single_elimination" || sections.size === 1) {
    return rounds(tournament, matches, seeds, live);
  }
  return [...sections]
    .map(
      ([key, list]) => `
        <div class="bracket-section">
          <h3 class="swiss-round-header">${esc(key === null ? "Bracket" : (SECTION_LABELS.get(key) ?? key))}</h3>
          ${rounds(tournament, list, seeds, live)}
        </div>`,
    )
    .join("");
}
