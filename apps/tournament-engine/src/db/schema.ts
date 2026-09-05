import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export type TournamentStatus = "pending" | "underway" | "complete";
export type PhaseFormat = "swiss" | "single_elimination" | "double_elimination";
export type EliminationFormat = Exclude<PhaseFormat, "swiss">;
export type PhaseStatus = "pending" | "underway" | "complete";
export type ParticipantStatus = "active" | "dropped";
export type MatchStatus = "pending" | "open" | "complete" | "bye" | "unreachable";
export type MatchSlot = "player1" | "player2";
export type BracketSection = "winners" | "losers" | "grand_final";
export type GrandFinalType = "none" | "simple" | "double";

const id = uuid().primaryKey().defaultRandom();
const createdAt = timestamp("created_at", { mode: "date" }).notNull().defaultNow();

export const tournamentsTable = pgTable("tournaments", {
  id,
  createdAt,
  name: text().notNull(),
  status: text().notNull().default("pending").$type<TournamentStatus>(),
});

export const participantsTable = pgTable(
  "participants",
  {
    id,
    createdAt,
    tournamentId: uuid("tournament_id")
      .references(() => tournamentsTable.id, { onDelete: "cascade" })
      .notNull(),
    name: text().notNull(),
    status: text().notNull().default("active").$type<ParticipantStatus>(),
    finalStanding: integer("final_standing"),
  },
  (t) => [unique().on(t.tournamentId, t.name), index().on(t.tournamentId)],
);

export const phasesTable = pgTable(
  "phases",
  {
    id,
    createdAt,
    tournamentId: uuid("tournament_id")
      .references(() => tournamentsTable.id, { onDelete: "cascade" })
      .notNull(),
    format: text().notNull().$type<PhaseFormat>(),
    position: integer().notNull(),
    status: text().notNull().default("pending").$type<PhaseStatus>(),
    rounds: integer(),
    currentRound: integer("current_round"),
    grandFinalType: text("grand_final_type").$type<GrandFinalType>(),
  },
  (t) => [unique().on(t.tournamentId, t.position), index().on(t.tournamentId)],
);

export const phaseParticipantsTable = pgTable(
  "phase_participants",
  {
    id,
    phaseId: uuid("phase_id")
      .references(() => phasesTable.id, { onDelete: "cascade" })
      .notNull(),
    participantId: uuid("participant_id")
      .references(() => participantsTable.id, { onDelete: "cascade" })
      .notNull(),
    seed: integer().notNull(),
    finalStanding: integer("final_standing"),
  },
  (t) => [unique().on(t.phaseId, t.participantId), index().on(t.phaseId)],
);

export const matchesTable = pgTable(
  "matches",
  {
    id,
    phaseId: uuid("phase_id")
      .references(() => phasesTable.id, { onDelete: "cascade" })
      .notNull(),
    matchNumber: integer("match_number").notNull(),
    roundNumber: integer("round_number").notNull(),
    bracketSection: text("bracket_section").$type<BracketSection>(),
    player1Id: uuid("player1_id").references(() => participantsTable.id, { onDelete: "cascade" }),
    player2Id: uuid("player2_id").references(() => participantsTable.id, { onDelete: "cascade" }),
    winnerId: uuid("winner_id").references(() => participantsTable.id, { onDelete: "cascade" }),
    nextMatchId: uuid("next_match_id").references((): AnyPgColumn => matchesTable.id),
    nextMatchSlot: text("next_match_slot").$type<MatchSlot>(),
    loserNextMatchId: uuid("loser_next_match_id").references((): AnyPgColumn => matchesTable.id),
    loserNextMatchSlot: text("loser_next_match_slot").$type<MatchSlot>(),
    status: text().notNull().default("pending").$type<MatchStatus>(),
    forfeit: boolean().notNull().default(false),
  },
  (t) => [
    unique().on(t.phaseId, t.matchNumber),
    index().on(t.phaseId),
    index().on(t.player1Id),
    index().on(t.player2Id),
  ],
);

export type Tournament = typeof tournamentsTable.$inferSelect;
export type Participant = typeof participantsTable.$inferSelect;
export type Phase = typeof phasesTable.$inferSelect;
export type Match = typeof matchesTable.$inferSelect;
