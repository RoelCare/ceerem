ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contacts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "views" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "views" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fields" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fields" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "workspace_isolation" ON "contacts" AS PERMISSIVE FOR ALL USING (workspace_id = current_setting('app.workspace_id', true)) WITH CHECK (workspace_id = current_setting('app.workspace_id', true));--> statement-breakpoint
CREATE POLICY "workspace_isolation" ON "views" AS PERMISSIVE FOR ALL USING (workspace_id = current_setting('app.workspace_id', true)) WITH CHECK (workspace_id = current_setting('app.workspace_id', true));--> statement-breakpoint
CREATE POLICY "workspace_isolation" ON "fields" AS PERMISSIVE FOR ALL USING (workspace_id = current_setting('app.workspace_id', true)) WITH CHECK (workspace_id = current_setting('app.workspace_id', true));
