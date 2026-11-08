import type { GrandFinalType } from "../../formats/types.ts";
import { phaseIdAt } from "../state.ts";
import type { ActionResult, PhaseFormat } from "../types.ts";

export type CreateTournamentInput = {
  format: PhaseFormat;
  grandFinalType?: GrandFinalType;
  id: string;
  name: string;
  rounds?: number;
};

export function createTournament(input: CreateTournamentInput): ActionResult {
  return {
    tournament: {
      id: input.id,
      name: input.name,
      status: "pending",
      participantSequence: 0,
      participants: [],
      phases: [
        {
          id: phaseIdAt(1),
          format: input.format,
          position: 1,
          status: "pending",
          rounds: input.format === "swiss" ? (input.rounds ?? null) : null,
          currentRound: null,
          grandFinalType:
            input.format === "double_elimination" ? (input.grandFinalType ?? "double") : null,
        },
      ],
      phaseParticipants: [],
      matches: [],
    },
    events: [{ type: "tournament_created", tournamentId: input.id }],
  };
}
