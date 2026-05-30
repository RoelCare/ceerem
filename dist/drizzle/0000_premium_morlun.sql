CREATE TYPE "public"."contact_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"parent_id" text,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"street" text,
	"street_number" text,
	"zipcode" text,
	"city" text,
	"state" text,
	"country" text,
	"status" "contact_status" DEFAULT 'active' NOT NULL,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
