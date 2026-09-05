ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "scraped_emails" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_lead_status_idx" ON "businesses" USING btree ("lead_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_priority_idx" ON "businesses" USING btree ("priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_website_idx" ON "businesses" USING btree ("website");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_category_idx" ON "businesses" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_zipcode_idx" ON "businesses" USING btree ("zipcode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_created_at_idx" ON "businesses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scrape_sessions_started_at_idx" ON "scrape_sessions" USING btree ("started_at");