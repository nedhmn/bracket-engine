CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"match_number" integer NOT NULL,
	"round_number" integer NOT NULL,
	"bracket_section" text,
	"player1_id" uuid,
	"player2_id" uuid,
	"winner_id" uuid,
	"next_match_id" uuid,
	"next_match_slot" text,
	"loser_next_match_id" uuid,
	"loser_next_match_slot" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"forfeit" boolean DEFAULT false NOT NULL,
	CONSTRAINT "matches_phase_id_match_number_unique" UNIQUE("phase_id","match_number")
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"final_standing" integer,
	CONSTRAINT "participants_tournament_id_name_unique" UNIQUE("tournament_id","name")
);
--> statement-breakpoint
CREATE TABLE "phase_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"seed" integer NOT NULL,
	"final_standing" integer,
	CONSTRAINT "phase_participants_phase_id_participant_id_unique" UNIQUE("phase_id","participant_id")
);
--> statement-breakpoint
CREATE TABLE "phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"format" text NOT NULL,
	"position" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"rounds" integer,
	"current_round" integer,
	"grand_final_type" text,
	CONSTRAINT "phases_tournament_id_position_unique" UNIQUE("tournament_id","position")
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_phase_id_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_player1_id_participants_id_fk" FOREIGN KEY ("player1_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_player2_id_participants_id_fk" FOREIGN KEY ("player2_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_id_participants_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_next_match_id_matches_id_fk" FOREIGN KEY ("next_match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_loser_next_match_id_matches_id_fk" FOREIGN KEY ("loser_next_match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_participants" ADD CONSTRAINT "phase_participants_phase_id_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_participants" ADD CONSTRAINT "phase_participants_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phases" ADD CONSTRAINT "phases_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matches_phase_id_index" ON "matches" USING btree ("phase_id");--> statement-breakpoint
CREATE INDEX "matches_player1_id_index" ON "matches" USING btree ("player1_id");--> statement-breakpoint
CREATE INDEX "matches_player2_id_index" ON "matches" USING btree ("player2_id");--> statement-breakpoint
CREATE INDEX "participants_tournament_id_index" ON "participants" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "phase_participants_phase_id_index" ON "phase_participants" USING btree ("phase_id");--> statement-breakpoint
CREATE INDEX "phases_tournament_id_index" ON "phases" USING btree ("tournament_id");