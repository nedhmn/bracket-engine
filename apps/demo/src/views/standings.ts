import type { Phase, Tournament } from "tournament-engine";
import { phaseStandings, swissRankings } from "tournament-engine";

import { esc, isDropped, nameOf } from "./html.ts";

type Row = {
  cells: (string | number)[];
  dropped: boolean;
};

function table(title: string, head: string[], rows: Row[]): string {
  if (rows.length === 0) {
    return "";
  }
  const header = head.map((h) => `<th>${esc(h)}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr class="${r.dropped ? "dropped" : ""}">${r.cells
          .map((c, i) => `<td class="${i === 1 ? "player-name" : ""}">${esc(c)}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  return `
    <div class="standings">
      <h3 class="standings-title">${esc(title)}</h3>
      <div class="table-scroll"><table class="standings-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>
    </div>`;
}

export function renderPhaseStandings(tournament: Tournament, phase: Phase): string {
  if (phase.format === "swiss") {
    const rows = swissRankings(tournament, phase.id).map((r) => ({
      cells: [
        r.rank,
        nameOf(tournament, r.participantId),
        `${r.wins}-${r.losses}`,
        r.tb1,
        r.tb2,
        r.tb3,
      ],
      dropped: isDropped(tournament, r.participantId),
    }));
    return table("Standings", ["#", "Player", "W-L", "TB1", "TB2", "TB3"], rows);
  }
  const rows = phaseStandings(tournament, phase.id).map((s) => ({
    cells: [s.rank, nameOf(tournament, s.participantId)],
    dropped: isDropped(tournament, s.participantId),
  }));
  return table("Standings", ["#", "Player"], rows);
}

export function renderFinalStandings(tournament: Tournament): string {
  const rows = tournament.participants
    .flatMap((p) => (p.finalStanding === null ? [] : [{ p, rank: p.finalStanding }]))
    .toSorted((a, b) => a.rank - b.rank || a.p.name.localeCompare(b.p.name))
    .map(({ p, rank }) => ({ cells: [rank, p.name], dropped: p.status === "dropped" }));
  return table("Final standings", ["#", "Player"], rows);
}
