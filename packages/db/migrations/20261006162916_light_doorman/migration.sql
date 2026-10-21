ALTER TABLE "public"."account" DROP CONSTRAINT "account_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "public"."session" DROP CONSTRAINT "session_user_id_user_id_fkey";--> statement-breakpoint
DROP TABLE "public"."account";--> statement-breakpoint
DROP TABLE "public"."session";--> statement-breakpoint
DROP TABLE "public"."user";--> statement-breakpoint
DROP TABLE "public"."verification";
