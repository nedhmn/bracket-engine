import type {
  BracketMatch,
  BracketSection,
  GrandFinalType,
  MantisRanking,
  MatchResult,
  Pairing,
  Standing,
} from "@bracket-engine/core";
import {
  advanceWinner,
  buildSwissStandings,
  calculateEliminationStandings,
  calculateMantisRankings,
  calculateRecommendedRounds,
  generateDoubleElimination,
  generateSingleElimination,
  generateSwissRound,
  reopenMatch,
} from "@bracket-engine/core";

type MatchState = {
  winnerSeed: number;
};

type SwissRoundData = {
  pairings: Pairing[];
  results: Map<string, string | null>;
};

type Phase = "idle" | "bracket" | "swiss" | "topcut";

type BracketParticipant = {
  id: string;
  seed: number;
};

type Snapshot = {
  phase: Phase;
  format: string;
  playerCount: number;
  swissCurrentRound?: number;
  swissTotalRounds?: number;
  swissParticipants?: string[];
  droppedPlayers?: string[];
  swissMatchResults?: MatchResult[];
  swissRounds?: { pairings: Pairing[]; results: Record<string, string | null> }[];
  swissStandings?: MantisRanking[];
  matches?: BracketMatch[];
  matchStates?: Record<string, MatchState>;
  eliminationStandings?: [string, number][];
  bracketParticipants?: BracketParticipant[];
};

let phase: Phase = "idle";
let allMatches: BracketMatch[] = [];
let matchStates = new Map<number, MatchState>();
let undoStack: Array<{
  matches: BracketMatch[];
  states: Map<number, MatchState>;
}> = [];
let selectedMatch: number | null = null;
let tournamentEnded = false;
let bracketParticipants: BracketParticipant[] = [];

let swissRounds: SwissRoundData[] = [];
let swissStandings: Standing[] = [];
let swissMatchResults: MatchResult[] = [];
let swissParticipants: string[] = [];
let swissCurrentRound = 0;
let swissTotalRounds = 0;
let droppedPlayers = new Set<string>();

let logEntries: string[] = [];
const TOP_CUT_SIZES = [4, 8, 16, 32];

const $ = (id: string) => document.getElementById(id)!;
const playerCountEl = $("playerCount") as HTMLInputElement;
const formatEl = $("format") as HTMLSelectElement;
const gfTypeEl = $("gfType") as HTMLSelectElement;
const topCutEl = $("topCut") as HTMLSelectElement;
const statusEl = $("status");
const appEl = $("app");
const logBody = $("logBody");
const logCount = $("logCount");

function log(msg: string, type: "action" | "undo" | "info" = "info") {
  const time = new Date().toLocaleTimeString("en", { hour12: false });
  const cls = type === "action" ? "log-action" : type === "undo" ? "log-undo" : "";
  logEntries.push(`<span class="log-time">${time}</span> <span class="${cls}">${msg}</span>`);
  logBody.innerHTML = logEntries.map((e) => `<div class="log-entry">${e}</div>`).join("");
  logBody.scrollTop = logBody.scrollHeight;
  logCount.textContent = String(logEntries.length);
}

function getPlayerCount(): number {
  const raw = Number(playerCountEl.value);
  const normalized = Number.isFinite(raw) ? Math.floor(raw) : 8;
  const clamped = Math.min(128, Math.max(2, normalized || 8));
  playerCountEl.value = String(clamped);
  return clamped;
}

function syncTopCutOptions() {
  const playerCount = getPlayerCount();
  let firstAvailable: string | null = null;

  for (const option of topCutEl.options) {
    const size = Number(option.value);
    const enabled = TOP_CUT_SIZES.includes(size) && size <= playerCount;
    option.disabled = !enabled;
    option.hidden = !enabled;
    if (enabled && firstAvailable === null) {
      firstAvailable = option.value;
    }
  }

  if (!firstAvailable) {
    topCutEl.value = topCutEl.options[0]?.value ?? "4";
    return;
  }

  const current = Number(topCutEl.value);
  if (!TOP_CUT_SIZES.includes(current) || current > playerCount) {
    const available = TOP_CUT_SIZES.filter((size) => size <= playerCount);
    topCutEl.value = String(available.at(-1) ?? Number(firstAvailable));
  }
}

function hasValidTopCutSize(): boolean {
  return TOP_CUT_SIZES.some((size) => size <= getPlayerCount());
}

function pushUndo() {
  undoStack.push({
    matches: allMatches.map((m) => ({ ...m })),
    states: new Map(matchStates),
  });
  updateCommandStates();
}

function isPlayable(match: BracketMatch): boolean {
  return (
    !matchStates.has(match.matchNumber) && match.player1Seed !== null && match.player2Seed !== null
  );
}

function isBye(match: BracketMatch): boolean {
  const p1 = match.player1Seed;
  const p2 = match.player2Seed;
  return (
    (p1 === null && p2 === null) || (p1 !== null && p2 === null) || (p1 === null && p2 !== null)
  );
}

function getBracketPlayerLabel(seed: number): string {
  const participant = bracketParticipants.find((p) => p.seed === seed);
  if (participant) {
    return participant.id;
  }
  return `Seed ${seed}`;
}

function pickWinner(matchNumber: number, winnerSeed: number) {
  if (tournamentEnded) {
    return;
  }
  pushUndo();
  matchStates.set(matchNumber, { winnerSeed });
  const { updatedMatches } = advanceWinner(allMatches, matchNumber, winnerSeed);
  allMatches = updatedMatches;
  log(`Match M${matchNumber}: Seed ${winnerSeed} wins`, "action");
  render();
}

function doReopen(matchNumber: number) {
  if (tournamentEnded) {
    return;
  }
  pushUndo();
  const { updatedMatches, cascadeInvalidated } = reopenMatch(allMatches, matchNumber);
  allMatches = updatedMatches;
  matchStates.delete(matchNumber);
  for (const mn of cascadeInvalidated) {
    matchStates.delete(mn);
  }
  log(`Reopened M${matchNumber} (cascade: ${cascadeInvalidated.length})`, "undo");
  selectedMatch = null;
  render();
}

function doUndo() {
  if (tournamentEnded) {
    return;
  }
  const prev = undoStack.pop();
  if (!prev) {
    return;
  }
  allMatches = prev.matches;
  matchStates = prev.states;
  selectedMatch = null;
  log("Undo", "undo");
  render();
}

function autoPlayBracket() {
  if (tournamentEnded) {
    return;
  }
  let advanced = true;
  while (advanced) {
    advanced = false;
    for (const match of allMatches) {
      if (isPlayable(match)) {
        pushUndo();
        const winner = Math.min(match.player1Seed!, match.player2Seed!);
        matchStates.set(match.matchNumber, { winnerSeed: winner });
        const { updatedMatches } = advanceWinner(allMatches, match.matchNumber, winner);
        allMatches = updatedMatches;
        advanced = true;
        break;
      }
    }
  }
  log("Auto-played all bracket matches", "action");
  render();
}

function initSwiss() {
  const count = getPlayerCount();
  swissParticipants = Array.from({ length: count }, (_, i) => `Player ${i + 1}`);
  swissRounds = [];
  swissMatchResults = [];
  swissCurrentRound = 0;
  swissTotalRounds = calculateRecommendedRounds(count);
  droppedPlayers = new Set();
  bracketParticipants = [];
  swissStandings = swissParticipants.map((id) => ({
    participantId: id,
    wins: 0,
    losses: 0,
    byes: 0,
    opponents: [],
    dropped: false,
  }));
}

function generateNextSwissRound() {
  if (tournamentEnded) {
    return;
  }
  swissCurrentRound++;
  const pairings = generateSwissRound(swissStandings, swissCurrentRound);
  const results = new Map<string, string | null>();
  for (const p of pairings) {
    results.set(p.player1, null);
  }
  swissRounds.push({ pairings, results });
  log(`Swiss Round ${swissCurrentRound} generated (${pairings.length} pairings)`, "action");

  for (const p of pairings) {
    if (p.player2 === null) {
      reportSwissResult(swissCurrentRound - 1, p.player1);
    }
  }

  render();
}

function reportSwissResult(roundIdx: number, winnerId: string) {
  if (tournamentEnded) {
    return;
  }
  const rd = swissRounds[roundIdx];
  const pairing = rd.pairings.find((p) => p.player1 === winnerId || p.player2 === winnerId);
  if (!pairing) {
    return;
  }

  rd.results.set(pairing.player1, winnerId);

  const loserId = pairing.player1 === winnerId ? pairing.player2 : pairing.player1;
  swissMatchResults.push({
    winnerId,
    player1Id: pairing.player1,
    player2Id: pairing.player2 ?? pairing.player1,
    roundNumber: roundIdx + 1,
  });

  rebuildSwissStandings();

  if (loserId === null) {
    log(`Round ${roundIdx + 1}: ${winnerId} gets BYE`, "info");
  } else {
    log(`Round ${roundIdx + 1}: ${winnerId} beats ${loserId}`, "action");
  }

  render();
}

function rebuildSwissStandings() {
  swissStandings = buildSwissStandings(
    swissParticipants.map((id) => ({
      participantId: id,
      dropped: droppedPlayers.has(id),
    })),
    swissMatchResults,
  );
}

function isSwissRoundComplete(): boolean {
  if (swissRounds.length === 0) {
    return true;
  }
  const rd = swissRounds[swissRounds.length - 1];
  return [...rd.results.values()].every((v) => v !== null);
}

function autoPlaySwissRound() {
  if (tournamentEnded) {
    return;
  }
  if (swissRounds.length === 0) {
    return;
  }
  const rd = swissRounds[swissRounds.length - 1];
  for (const p of rd.pairings) {
    if (rd.results.get(p.player1) !== null) {
      continue;
    }
    if (p.player2 === null) {
      reportSwissResult(swissRounds.length - 1, p.player1);
    } else {
      const winner = Math.random() < 0.5 ? p.player1 : p.player2;
      reportSwissResult(swissRounds.length - 1, winner);
    }
  }
  log(`Auto-played Swiss Round ${swissCurrentRound}`, "action");
  render();
}

function dropPlayer() {
  if (tournamentEnded) {
    return;
  }
  const name = prompt("Enter player name to drop (e.g. Player 3):");
  if (!name) {
    return;
  }

  if (phase === "swiss" || phase === "topcut") {
    if (swissParticipants.includes(name)) {
      droppedPlayers.add(name);
      rebuildSwissStandings();
      log(`Dropped ${name}`, "action");
      render();
    } else {
      alert(`Player "${name}" not found`);
    }
  }
}

function createTopCut() {
  const format = formatEl.value;
  syncTopCutOptions();
  const cutSize = Number(topCutEl.value);
  const rankings = calculateMantisRankings(swissParticipants, swissMatchResults);
  if (cutSize > rankings.length) {
    alert(`Top ${cutSize} requires at least ${cutSize} players.`);
    return;
  }
  const qualifiers = rankings.slice(0, cutSize);
  bracketParticipants = qualifiers.map((r, idx) => ({
    id: r.participantId,
    seed: idx + 1,
  }));

  log(`Top Cut: ${qualifiers.map((r) => r.participantId).join(", ")}`, "action");

  const isDE = format === "swiss_de";
  if (isDE) {
    const gfType = gfTypeEl.value as GrandFinalType;
    const result = generateDoubleElimination(cutSize, gfType);
    allMatches = [...result.winners, ...result.losers, ...result.grandFinal];
  } else {
    allMatches = generateSingleElimination(cutSize);
  }
  matchStates = new Map();
  undoStack = [];
  tournamentEnded = false;
  phase = "topcut";
  render();
}

function startTournament() {
  const format = formatEl.value;
  const playerCount = getPlayerCount();
  logEntries = [];
  undoStack = [];
  matchStates = new Map();
  selectedMatch = null;
  tournamentEnded = false;

  if (format === "single") {
    allMatches = generateSingleElimination(playerCount);
    bracketParticipants = Array.from({ length: playerCount }, (_, i) => ({
      id: `Seed ${i + 1}`,
      seed: i + 1,
    }));
    phase = "bracket";
    log(`SE bracket created (${allMatches.length} matches)`, "action");
  } else if (format === "double") {
    const gfType = gfTypeEl.value as GrandFinalType;
    const result = generateDoubleElimination(playerCount, gfType);
    allMatches = [...result.winners, ...result.losers, ...result.grandFinal];
    bracketParticipants = Array.from({ length: playerCount }, (_, i) => ({
      id: `Seed ${i + 1}`,
      seed: i + 1,
    }));
    phase = "bracket";
    log(`DE bracket created (${allMatches.length} matches)`, "action");
  } else {
    initSwiss();
    phase = "swiss";
    log(
      `Swiss tournament created (${swissParticipants.length} players, ${swissTotalRounds} rounds)`,
      "action",
    );
    generateNextSwissRound();
  }

  render();
}

function endTournament() {
  if (phase === "idle") {
    return;
  }
  tournamentEnded = true;
  log("Tournament ended", "action");
  render();
}

function resetAll() {
  phase = "idle";
  allMatches = [];
  matchStates = new Map();
  undoStack = [];
  selectedMatch = null;
  tournamentEnded = false;
  bracketParticipants = [];
  swissRounds = [];
  logEntries = [];
  logBody.innerHTML = "";
  logCount.textContent = "0";
  render();
}

function renderSlot(match: BracketMatch, slot: "player1" | "player2"): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "slot";

  const seed = slot === "player1" ? match.player1Seed : match.player2Seed;
  const state = matchStates.get(match.matchNumber);

  if (seed === null) {
    el.classList.add("empty");
    el.innerHTML = '<span class="seed-name">TBD</span>';
    return el;
  }

  if (state) {
    el.classList.add(state.winnerSeed === seed ? "winner" : "loser");
  } else if (isPlayable(match) && !tournamentEnded) {
    el.classList.add("clickable");
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      pickWinner(match.matchNumber, seed);
    });
  }

  el.innerHTML = `
    <span class="seed-name">${getBracketPlayerLabel(seed)}</span>
    <span class="seed-num">#${seed}</span>
  `;

  return el;
}

function renderMatch(match: BracketMatch): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "match";

  const completed = matchStates.has(match.matchNumber);
  if (completed) {
    el.classList.add("completed");
  } else if (isPlayable(match) && !tournamentEnded) {
    el.classList.add("playable");
  } else if (isBye(match)) {
    el.classList.add("bye");
  }

  if (selectedMatch === match.matchNumber) {
    el.classList.add("selected");
  }

  el.addEventListener("click", () => {
    selectedMatch = selectedMatch === match.matchNumber ? null : match.matchNumber;
    render();
  });

  const header = document.createElement("div");
  header.className = "match-id";
  header.innerHTML = `<span>M${match.matchNumber}</span>`;

  if (completed) {
    const reopenBtn = document.createElement("span");
    reopenBtn.className = "match-reopen";
    reopenBtn.textContent = "reopen";
    if (!tournamentEnded) {
      reopenBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        doReopen(match.matchNumber);
      });
      header.appendChild(reopenBtn);
    }
  }

  el.appendChild(header);
  el.appendChild(renderSlot(match, "player1"));
  el.appendChild(renderSlot(match, "player2"));

  return el;
}

function renderBracketSection(label: string, matches: BracketMatch[]): HTMLDivElement {
  const section = document.createElement("div");
  section.className = "section";

  const labelEl = document.createElement("div");
  labelEl.className = "section-label";
  labelEl.textContent = label;
  section.appendChild(labelEl);

  const rounds = new Map<number, BracketMatch[]>();
  for (const m of matches) {
    const arr = rounds.get(m.roundNumber) ?? [];
    arr.push(m);
    rounds.set(m.roundNumber, arr);
  }

  const bracketEl = document.createElement("div");
  bracketEl.className = "bracket";

  for (const roundNum of [...rounds.keys()].toSorted((a, b) => a - b)) {
    const roundMatches = rounds.get(roundNum)!.toSorted((a, b) => a.matchNumber - b.matchNumber);

    const roundEl = document.createElement("div");
    roundEl.className = "round";

    const roundLabel = document.createElement("div");
    roundLabel.className = "round-label";
    roundLabel.textContent = `R${roundNum}`;
    roundEl.appendChild(roundLabel);

    const matchesContainer = document.createElement("div");
    matchesContainer.className = "round-matches";
    for (const match of roundMatches) {
      matchesContainer.appendChild(renderMatch(match));
    }
    roundEl.appendChild(matchesContainer);

    bracketEl.appendChild(roundEl);
  }

  section.appendChild(bracketEl);
  return section;
}

function renderSwiss(): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "swiss-container";

  for (let i = 0; i < swissRounds.length; i++) {
    const rd = swissRounds[i];
    const roundEl = document.createElement("div");
    roundEl.className = "swiss-round";

    const header = document.createElement("div");
    header.className = "swiss-round-header";
    header.textContent = `Round ${i + 1}`;
    roundEl.appendChild(header);

    for (const p of rd.pairings) {
      const result = rd.results.get(p.player1);
      const pairingEl = document.createElement("div");
      pairingEl.className = "swiss-pairing";
      if (result !== null) {
        pairingEl.classList.add("has-result");
      }

      const p1El = document.createElement("div");
      p1El.className = "swiss-player";
      const p1Standing = swissStandings.find((s) => s.participantId === p.player1);

      if (result === p.player1) {
        p1El.classList.add("winner");
      } else if (result !== null) {
        p1El.classList.add("loser");
      }
      if (result === null) {
        p1El.addEventListener("click", () => reportSwissResult(i, p.player1));
      }

      p1El.innerHTML = `
        <span class="swiss-player-name">${p.player1}</span>
        <span class="swiss-player-record">${p1Standing ? `${p1Standing.wins}-${p1Standing.losses}` : ""}</span>
      `;

      const vsEl = document.createElement("div");
      vsEl.className = "swiss-vs";
      vsEl.textContent = "vs";

      pairingEl.appendChild(p1El);
      pairingEl.appendChild(vsEl);

      if (p.player2 === null) {
        const byeEl = document.createElement("div");
        byeEl.className = "swiss-player bye-player";
        byeEl.innerHTML =
          '<span class="swiss-player-name" style="color:var(--text-3);font-style:italic">BYE</span>';
        pairingEl.appendChild(byeEl);
      } else {
        const p2El = document.createElement("div");
        p2El.className = "swiss-player";
        const p2Standing = swissStandings.find((s) => s.participantId === p.player2);

        if (result === p.player2) {
          p2El.classList.add("winner");
        } else if (result !== null) {
          p2El.classList.add("loser");
        }
        if (result === null) {
          p2El.addEventListener("click", () => reportSwissResult(i, p.player2!));
        }

        p2El.innerHTML = `
          <span class="swiss-player-name">${p.player2}</span>
          <span class="swiss-player-record">${p2Standing ? `${p2Standing.wins}-${p2Standing.losses}` : ""}</span>
        `;
        pairingEl.appendChild(p2El);
      }

      roundEl.appendChild(pairingEl);
    }

    container.appendChild(roundEl);
  }

  const rankings = calculateMantisRankings(swissParticipants, swissMatchResults);
  if (rankings.length > 0 && swissMatchResults.length > 0) {
    container.appendChild(renderStandings(rankings));
  }

  return container;
}

function renderStandings(rankings: MantisRanking[]): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "standings";

  const title = document.createElement("div");
  title.className = "standings-title";
  title.textContent = "Standings";
  el.appendChild(title);

  const table = document.createElement("table");
  table.className = "standings-table";
  table.innerHTML = `
    <thead>
      <tr><th>#</th><th>Player</th><th>Score</th><th>TB1</th><th>TB2</th><th>TB3</th></tr>
    </thead>
    <tbody>
      ${rankings
        .map((r) => {
          const dropped = droppedPlayers.has(r.participantId);
          return `<tr class="${dropped ? "dropped" : ""}">
            <td>${r.rank}</td>
            <td class="player-name">${r.participantId}</td>
            <td>${r.wins}-${r.losses}</td>
            <td>${r.tb1}</td>
            <td>${r.tb2}</td>
            <td>${r.tb3}</td>
          </tr>`;
        })
        .join("")}
    </tbody>
  `;
  el.appendChild(table);
  return el;
}

function getSeedToIdMap(): Map<number, string> {
  return new Map(bracketParticipants.map((p) => [p.seed, p.id]));
}

function getEliminationRecords(): Map<string, { wins: number; losses: number }> {
  const seedToId = getSeedToIdMap();
  const records = new Map<string, { wins: number; losses: number }>();

  for (const participant of bracketParticipants) {
    records.set(participant.id, { wins: 0, losses: 0 });
  }

  for (const match of allMatches) {
    if ((match.status !== "complete" && match.status !== "bye") || match.winnerSeed === null) {
      continue;
    }

    const winnerId = seedToId.get(match.winnerSeed);
    if (winnerId) {
      const winnerRecord = records.get(winnerId) ?? { wins: 0, losses: 0 };
      winnerRecord.wins++;
      records.set(winnerId, winnerRecord);
    }

    const loserSeed =
      match.player1Seed === match.winnerSeed ? match.player2Seed : match.player1Seed;
    const loserId = loserSeed === null ? null : (seedToId.get(loserSeed) ?? null);
    if (loserId) {
      const loserRecord = records.get(loserId) ?? { wins: 0, losses: 0 };
      loserRecord.losses++;
      records.set(loserId, loserRecord);
    }
  }

  return records;
}

function renderEliminationStandings(): HTMLDivElement | null {
  if (bracketParticipants.length === 0) {
    return null;
  }

  const seedToId = getSeedToIdMap();
  const standings = calculateEliminationStandings(
    allMatches.map((m) => ({
      matchNumber: m.matchNumber,
      roundNumber: m.roundNumber,
      bracketSection: m.bracketSection,
      player1Id: m.player1Seed === null ? null : (seedToId.get(m.player1Seed) ?? null),
      player2Id: m.player2Seed === null ? null : (seedToId.get(m.player2Seed) ?? null),
      winnerId: m.winnerSeed === null ? null : (seedToId.get(m.winnerSeed) ?? null),
      status: m.status,
    })),
    bracketParticipants.map((p) => ({
      id: p.id,
      seed: p.seed,
    })),
  );

  const rows = [...standings.entries()]
    .toSorted((a, b) => a[1].rank - b[1].rank)
    .map(([id, entry]) => ({ id, rank: entry.rank }));
  const records = getEliminationRecords();

  if (rows.length === 0) {
    return null;
  }

  const el = document.createElement("div");
  el.className = "standings";

  const title = document.createElement("div");
  title.className = "standings-title";
  title.textContent = tournamentEnded ? "Final Standings" : "Projected Standings";
  el.appendChild(title);

  const table = document.createElement("table");
  table.className = "standings-table";
  table.innerHTML = `
    <thead>
      <tr><th>#</th><th>Player</th><th>Seed</th><th>Score</th></tr>
    </thead>
    <tbody>
      ${rows
        .map((row) => {
          const seed = bracketParticipants.find((p) => p.id === row.id)?.seed ?? "";
          const record = records.get(row.id) ?? { wins: 0, losses: 0 };
          return `<tr>
            <td>${row.rank}</td>
            <td class="player-name">${row.id}</td>
            <td>${seed}</td>
            <td>${record.wins}-${record.losses}</td>
          </tr>`;
        })
        .join("")}
    </tbody>
  `;
  el.appendChild(table);
  return el;
}

function getEliminationStandingsEntries(): [string, number][] {
  if (bracketParticipants.length === 0) {
    return [];
  }

  const seedToId = getSeedToIdMap();
  const standings = calculateEliminationStandings(
    allMatches.map((m) => ({
      matchNumber: m.matchNumber,
      roundNumber: m.roundNumber,
      bracketSection: m.bracketSection,
      player1Id: m.player1Seed === null ? null : (seedToId.get(m.player1Seed) ?? null),
      player2Id: m.player2Seed === null ? null : (seedToId.get(m.player2Seed) ?? null),
      winnerId: m.winnerSeed === null ? null : (seedToId.get(m.winnerSeed) ?? null),
      status: m.status,
    })),
    bracketParticipants.map((p) => ({
      id: p.id,
      seed: p.seed,
    })),
  );
  return Array.from(standings.entries(), ([id, entry]) => [id, entry.rank]);
}

function updateCommandStates() {
  syncTopCutOptions();
  const format = formatEl.value;
  const isSwissFormat = format.startsWith("swiss");
  const isBracketPhase = phase === "bracket" || phase === "topcut";
  const isSwissPhase = phase === "swiss";

  ($("cmdStart") as HTMLButtonElement).disabled = phase !== "idle";
  ($("cmdEnd") as HTMLButtonElement).disabled = phase === "idle" || tournamentEnded;
  ($("cmdUndo") as HTMLButtonElement).disabled =
    undoStack.length === 0 || !isBracketPhase || tournamentEnded;
  ($("cmdAutoPlay") as HTMLButtonElement).disabled = !isBracketPhase || tournamentEnded;
  ($("cmdDropPlayer") as HTMLButtonElement).disabled = !isSwissPhase || tournamentEnded;

  $("cmdNextRound").style.display = isSwissPhase ? "" : "none";
  ($("cmdNextRound") as HTMLButtonElement).disabled =
    !isSwissRoundComplete() || swissCurrentRound >= swissTotalRounds || tournamentEnded;

  $("cmdAutoRound").style.display = isSwissPhase ? "" : "none";
  ($("cmdAutoRound") as HTMLButtonElement).disabled = isSwissRoundComplete() || tournamentEnded;

  $("cmdTopCut").style.display = isSwissPhase && isSwissFormat && format !== "swiss" ? "" : "none";
  ($("cmdTopCut") as HTMLButtonElement).disabled =
    !isSwissRoundComplete() ||
    swissCurrentRound < swissTotalRounds ||
    tournamentEnded ||
    !hasValidTopCutSize();

  $("gfGroup").style.display = format === "double" || format === "swiss_de" ? "" : "none";
  $("topCutGroup").style.display = isSwissFormat && format !== "swiss" ? "" : "none";

  ($("cmdAutoPlay") as HTMLButtonElement).style.display = isBracketPhase ? "" : "none";
}

function updateStatus() {
  if (phase === "idle") {
    statusEl.textContent = "Configure and press Start";
    statusEl.className = "status-bar";
    return;
  }

  if (tournamentEnded) {
    statusEl.textContent = "Tournament complete";
    statusEl.className = "status-bar complete";
    return;
  }

  if (phase === "swiss") {
    const roundDone = isSwissRoundComplete();
    if (swissCurrentRound >= swissTotalRounds && roundDone) {
      statusEl.textContent = `Swiss complete · ${swissTotalRounds} rounds played`;
      statusEl.className = "status-bar complete";
    } else {
      statusEl.textContent = `Swiss R${swissCurrentRound}/${swissTotalRounds}${roundDone ? " · done" : ""}`;
      statusEl.className = "status-bar";
    }
    return;
  }

  const playable = allMatches.filter(isPlayable).length;
  const completed = matchStates.size;
  const total = allMatches.length;

  if (playable === 0 && completed === total) {
    const finalMatch = allMatches.find(
      (m) => m.nextMatchNumber === null && matchStates.has(m.matchNumber),
    );
    const state = finalMatch ? matchStates.get(finalMatch.matchNumber) : null;
    statusEl.textContent = state ? `Winner: Seed ${state.winnerSeed}` : "Complete";
    statusEl.className = "status-bar complete";
  } else {
    statusEl.textContent = `${completed}/${total} · ${playable} ready`;
    statusEl.className = "status-bar";
  }
}

function render() {
  appEl.innerHTML = "";
  updateCommandStates();
  updateStatus();

  if (phase === "idle") {
    return;
  }

  if (phase === "swiss") {
    const banner = document.createElement("div");
    banner.className = "phase-banner active";
    banner.textContent = `Swiss · Round ${swissCurrentRound} of ${swissTotalRounds}`;
    appEl.appendChild(banner);
    appEl.appendChild(renderSwiss());
    return;
  }

  if (phase === "topcut") {
    const banner = document.createElement("div");
    banner.className = "phase-banner active";
    banner.textContent = `Top Cut · ${formatEl.value === "swiss_de" ? "Double Elimination" : "Single Elimination"}`;
    appEl.appendChild(banner);
  }

  const sections = new Map<BracketSection | null, BracketMatch[]>();
  for (const m of allMatches) {
    const arr = sections.get(m.bracketSection) ?? [];
    arr.push(m);
    sections.set(m.bracketSection, arr);
  }

  const format = formatEl.value;
  if (format === "single" || (phase === "topcut" && format === "swiss_se")) {
    const winners = sections.get("winners") ?? sections.get(null) ?? [];
    if (winners.length > 0) {
      appEl.appendChild(renderBracketSection("Bracket", winners));
    }
  } else {
    const winners = sections.get("winners") ?? [];
    const losers = sections.get("losers") ?? [];
    const gf = sections.get("grand_final") ?? [];

    if (winners.length > 0) {
      appEl.appendChild(renderBracketSection("Winners Bracket", winners));
    }
    if (losers.length > 0) {
      appEl.appendChild(renderBracketSection("Losers Bracket", losers));
    }
    if (gf.length > 0) {
      appEl.appendChild(renderBracketSection("Grand Final", gf));
    }
  }

  const standingsEl = renderEliminationStandings();
  if (standingsEl) {
    appEl.appendChild(standingsEl);
  }
}

function copyJson() {
  const state: Snapshot = {
    phase,
    format: formatEl.value,
    playerCount: getPlayerCount(),
  };

  if (phase === "swiss" || phase === "topcut") {
    const swissRankings = calculateMantisRankings(swissParticipants, swissMatchResults);
    state.swissCurrentRound = swissCurrentRound;
    state.swissTotalRounds = swissTotalRounds;
    state.swissParticipants = swissParticipants;
    state.droppedPlayers = [...droppedPlayers];
    state.swissMatchResults = swissMatchResults;
    state.swissRounds = swissRounds.map((rd) => ({
      pairings: rd.pairings,
      results: Object.fromEntries(rd.results),
    }));
    state.swissStandings = swissRankings;
  }

  if (phase === "bracket" || phase === "topcut") {
    state.matches = allMatches;
    state.matchStates = Object.fromEntries(matchStates);
    state.eliminationStandings = getEliminationStandingsEntries();
    state.bracketParticipants = bracketParticipants;
  }

  navigator.clipboard.writeText(JSON.stringify(state, null, 2)).then(() => {
    const btn = $("cmdCopyJson") as HTMLButtonElement;
    btn.textContent = "Copied!";
    setTimeout(() => {
      btn.textContent = "Copy JSON";
    }, 1500);
  });
}

$("cmdStart").addEventListener("click", startTournament);
$("cmdEnd").addEventListener("click", endTournament);
$("cmdReset").addEventListener("click", resetAll);
$("cmdAutoPlay").addEventListener("click", autoPlayBracket);
$("cmdAutoRound").addEventListener("click", autoPlaySwissRound);
$("cmdUndo").addEventListener("click", doUndo);
$("cmdDropPlayer").addEventListener("click", dropPlayer);
$("cmdNextRound").addEventListener("click", generateNextSwissRound);
$("cmdTopCut").addEventListener("click", createTopCut);
$("cmdCopyJson").addEventListener("click", copyJson);

$("logToggle").addEventListener("click", () => {
  $("logPanel").classList.toggle("open");
});

formatEl.addEventListener("change", () => {
  resetAll();
  updateCommandStates();
});

playerCountEl.addEventListener("change", () => {
  getPlayerCount();
  syncTopCutOptions();
  resetAll();
  updateCommandStates();
});

playerCountEl.addEventListener("blur", () => {
  getPlayerCount();
  syncTopCutOptions();
  resetAll();
  updateCommandStates();
});

gfTypeEl.addEventListener("change", () => {
  resetAll();
  updateCommandStates();
});

topCutEl.addEventListener("change", () => {
  syncTopCutOptions();
  updateCommandStates();
});

render();
