ALTER TABLE "businesses" ADD COLUMN "review_snippets" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "keyword_categories" jsonb;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "business_context" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "website_prompt" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "website_analysis" jsonb;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "tokens_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scrape_sessions" ADD COLUMN "tokens_used" integer DEFAULT 0 NOT NULL;