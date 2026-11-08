import { describe, expect, it } from "vitest";

import { buildSwissStandings } from "../../../src/formats/swiss/standings.ts";

describe("buildSwissStandings", () => {
  it("builds wins, losses, opponents, and dropped flags from match results", () => {
    const standings = buildSwissStandings(
      [
        { participantId: "A", dropped: false },
        { participantId: "B", dropped: true },
        { participantId: "C", dropped: false },
      ],
      [
        { winnerId: "A", player1Id: "A", player2Id: "B", roundNumber: 1 },
        { winnerId: "C", player1Id: "C", player2Id: null, roundNumber: 1 },
        { winnerId: "C", player1Id: "A", player2Id: "C", roundNumber: 2 },
      ],
    );

    expect(standings).toEqual([
      {
        participantId: "A",
        wins: 1,
        losses: 1,
        byes: 0,
        floats: 0,
        opponents: ["B", "C"],
        dropped: false,
      },
      {
        participantId: "B",
        wins: 0,
        losses: 1,
        byes: 0,
        floats: 0,
        opponents: ["A"],
        dropped: true,
      },
      {
        participantId: "C",
        wins: 2,
        losses: 0,
        byes: 1,
        floats: 0,
        opponents: ["A"],
        dropped: false,
      },
    ]);
  });

  it("counts a float for the higher record in a cross-group pairing", () => {
    const standings = buildSwissStandings(
      ["A", "B", "C", "D", "E"].map((participantId) => ({
        participantId,
        dropped: false,
      })),
      [
        { winnerId: "D", player1Id: "A", player2Id: "D", roundNumber: 2 },
        { winnerId: "B", player1Id: "C", player2Id: "B", roundNumber: 2 },
        { winnerId: "E", player1Id: "E", player2Id: null, roundNumber: 2 },
        { winnerId: "A", player1Id: "A", player2Id: "B", roundNumber: 1 },
        { winnerId: "C", player1Id: "C", player2Id: "D", roundNumber: 1 },
        { winnerId: "E", player1Id: "E", player2Id: null, roundNumber: 1 },
      ],
    );

    expect(Object.fromEntries(standings.map((s) => [s.participantId, s.floats]))).toEqual({
      A: 1,
      B: 0,
      C: 1,
      D: 0,
      E: 0,
    });
  });
});
