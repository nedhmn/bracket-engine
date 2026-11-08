import type { Match, Phase, Tournament } from "tournament-engine";
import { swissRankings } from "tournament-engine";

import { esc, isLive, nameOf, phaseMatches } from "./html.ts";

function player(
  tournament: Tournament,
  match: Match,
  id: string,
  records: Map<string, string>,
  live: boolean,
): string {
  const state = match.winnerId === null ? "" : match.winnerId === id ? "winner" : "loser";
  const body = `<span class="swiss-player-name">${esc(nameOf(tournament, id))}</span><span class="swiss-player-record">${esc(records.get(id) ?? "")}</span>`;
  if (live && match.status === "open") {
    return `<button class="swiss-player clickable" type="button" data-action="report" data-match="${esc(match.id)}" data-winner="${esc(id)}">${body}</button>`;
  }
  return `<div class="swiss-player ${state}">${body}</div>`;
}

function pairing(
  tournament: Tournament,
  match: Match,
  records: Map<string, string>,
  live: boolean,
): string {
  const p1 = match.player1Id;
  const p2 = match.player2Id;
  const left = p1 === null ? "" : player(tournament, match, p1, records, live);
  const right =
    p2 === null
      ? '<div class="swiss-player bye-player"><span class="swiss-player-name">BYE</span></div>'
      : player(tournament, match, p2, records, live);
  const tag = match.forfeit ? '<span class="tag">forfeit</span>' : "";
  const reopen =
    live && match.status === "complete"
      ? `<button class="reopen" type="button" data-action="reopen" data-match="${esc(match.id)}">Reopen</button>`
      : "";
  const done = match.status === "complete" || match.status === "bye";
  return `
    <div class="swiss-pairing ${done ? "has-result" : ""}" data-match-id="${esc(match.id)}">
      ${left}<span class="swiss-vs">vs</span>${right}
      ${tag || reopen ? `<div class="pairing-meta">${tag}${reopen}</div>` : ""}
    </div>`;
}

export function renderSwiss(tournament: Tournament, phase: Phase): string {
  const live = isLive(tournament, phase);
  const records = new Map(
    swissRankings(tournament, phase.id).map((r) => [r.participantId, `${r.wins}-${r.losses}`]),
  );
  const rounds = new Map<number, Match[]>();
  for (const m of phaseMatches(tournament, phase.id)) {
    rounds.set(m.roundNumber, [...(rounds.get(m.roundNumber) ?? []), m]);
  }
  return [...rounds]
    .toSorted(([a], [b]) => b - a)
    .map(
      ([round, matches]) => `
        <div class="swiss-round">
          <h3 class="swiss-round-header">Round ${round}</h3>
          ${matches.map((m) => pairing(tournament, m, records, live)).join("")}
        </div>`,
    )
    .join("");
}
