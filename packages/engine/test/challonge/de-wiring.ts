import { generateDoubleElimination } from "../../src/formats/elimination/double.ts";
import type { BracketMatch, MatchSlot } from "../../src/formats/types.ts";

export type DeWiringSlot = { seed: number } | { winnerOf: string } | { loserOf: string } | null;

export type DeWiringMatch = {
  id: string;
  player1: DeWiringSlot;
  player2: DeWiringSlot;
  round: number;
};

export type DeWiring = {
  matches: DeWiringMatch[];
  players: number;
};

const matchId = (m: BracketMatch): string => `M${m.matchNumber}`;

const sectionRound = (m: BracketMatch, wbRounds: number): number => {
  if (m.bracketSection === "losers") {
    return -m.roundNumber;
  }
  if (m.bracketSection === "grand_final") {
    return wbRounds + m.roundNumber;
  }
  return m.roundNumber;
};

const slotKey = (matchNumber: number, slot: MatchSlot) => `${matchNumber}:${slot}`;

export const ourDeWiring = (players: number): DeWiring => {
  const result = generateDoubleElimination(players, "simple");
  const all = [...result.winners, ...result.losers, ...result.grandFinal];
  const wbRounds = Math.max(...result.winners.map((m) => m.roundNumber));
  const sources = new Map<string, DeWiringSlot>();
  for (const m of all) {
    if (m.nextMatchNumber !== null && m.nextMatchSlot !== null) {
      sources.set(slotKey(m.nextMatchNumber, m.nextMatchSlot), {
        winnerOf: matchId(m),
      });
    }
    if (m.loserNextMatchNumber !== null && m.loserNextMatchSlot !== null) {
      sources.set(slotKey(m.loserNextMatchNumber, m.loserNextMatchSlot), {
        loserOf: matchId(m),
      });
    }
  }
  const slot = (m: BracketMatch, which: MatchSlot): DeWiringSlot => {
    const source = sources.get(slotKey(m.matchNumber, which));
    if (source) {
      return source;
    }
    const seed = which === "player1" ? m.player1Seed : m.player2Seed;
    return seed === null ? null : { seed };
  };
  return {
    players,
    matches: all.map((m) => ({
      id: matchId(m),
      round: sectionRound(m, wbRounds),
      player1: slot(m, "player1"),
      player2: slot(m, "player2"),
    })),
  };
};

type Resolved = { seed: number } | { loserOf: string } | { winnerOf: string };

export const resolveByes = (wiring: DeWiring): DeWiring => {
  const byId = new Map(wiring.matches.map((m) => [m.id, m]));
  const memo = new Map<string, [Resolved | null, Resolved | null]>();

  const resolveMatch = (id: string): [Resolved | null, Resolved | null] => {
    const cached = memo.get(id);
    if (cached) {
      return cached;
    }
    const match = byId.get(id);
    if (!match) {
      throw new Error(`unknown match ${id}`);
    }
    const resolved: [Resolved | null, Resolved | null] = [
      resolveSlot(match.player1),
      resolveSlot(match.player2),
    ];
    memo.set(id, resolved);
    return resolved;
  };

  const isReal = (id: string): boolean => resolveMatch(id).every((s) => s !== null);

  const resolveSlot = (slot: DeWiringSlot): Resolved | null => {
    if (slot === null || "seed" in slot) {
      return slot;
    }
    if ("loserOf" in slot) {
      return isReal(slot.loserOf) ? slot : null;
    }
    if (isReal(slot.winnerOf)) {
      return slot;
    }
    const [a, b] = resolveMatch(slot.winnerOf);
    return a ?? b;
  };

  return {
    players: wiring.players,
    matches: wiring.matches.flatMap((m) => {
      const [player1, player2] = resolveMatch(m.id);
      return player1 && player2 ? [{ ...m, player1, player2 }] : [];
    }),
  };
};

const finalMatch = (wiring: DeWiring): DeWiringMatch => {
  const fed = new Set(
    wiring.matches.flatMap((m) =>
      [m.player1, m.player2].flatMap((s) => (s && "winnerOf" in s ? [s.winnerOf] : [])),
    ),
  );
  const finals = wiring.matches.filter((m) => !fed.has(m.id));
  if (finals.length !== 1) {
    throw new Error(`expected one final, found ${finals.length}`);
  }
  return finals[0];
};

export const canonicalDeWiring = (wiring: DeWiring): string => {
  const real = resolveByes(wiring);
  const byId = new Map(real.matches.map((m) => [m.id, m]));
  const memo = new Map<string, string>();

  const describeSlot = (slot: DeWiringSlot): string => {
    if (slot === null) {
      return "-";
    }
    if ("seed" in slot) {
      return String(slot.seed);
    }
    if ("winnerOf" in slot) {
      return `W${describeMatch(slot.winnerOf)}`;
    }
    return `L${describeMatch(slot.loserOf)}`;
  };

  const describeMatch = (id: string): string => {
    const cached = memo.get(id);
    if (cached !== undefined) {
      return cached;
    }
    const match = byId.get(id);
    if (!match) {
      throw new Error(`unknown match ${id}`);
    }
    const sides = [describeSlot(match.player1), describeSlot(match.player2)];
    const description = `(${sides.toSorted().join(",")})`;
    memo.set(id, description);
    return description;
  };

  return describeMatch(finalMatch(real).id);
};
