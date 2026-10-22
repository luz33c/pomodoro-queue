CREATE TABLE "todo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "todo_owner_id_idx" ON "todo" ("owner_id");