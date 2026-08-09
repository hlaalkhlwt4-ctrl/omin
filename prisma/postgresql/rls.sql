-- OmniFlow PostgreSQL row-level security policies.
-- The runtime database role must not own these tables and must not have BYPASSRLS.

CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.current_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')
$$;

CREATE OR REPLACE FUNCTION app_private.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.is_super_admin', true), '')::boolean, false)
$$;

CREATE OR REPLACE FUNCTION app_private.can_access_workspace(target_workspace_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT app_private.is_super_admin() OR EXISTS (
    SELECT 1
    FROM "WorkspaceMember" member
    JOIN "Workspace" workspace ON workspace.id = member."workspaceId"
    WHERE member."workspaceId" = target_workspace_id
      AND member."userId" = app_private.current_user_id()
      AND member.status = 'ACTIVE'
      AND workspace.status <> 'SUSPENDED'
  )
$$;

CREATE OR REPLACE FUNCTION app_private.can_write_workspace(target_workspace_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT app_private.is_super_admin() OR EXISTS (
    SELECT 1
    FROM "WorkspaceMember" member
    JOIN "Workspace" workspace ON workspace.id = member."workspaceId"
    WHERE member."workspaceId" = target_workspace_id
      AND member."userId" = app_private.current_user_id()
      AND member.status = 'ACTIVE'
      AND workspace.status = 'ACTIVE'
  )
$$;

REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.current_user_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.is_super_admin() TO PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.can_access_workspace(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.can_write_workspace(text) TO PUBLIC;

ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workspace_tenant_policy ON "Workspace";
CREATE POLICY workspace_tenant_policy ON "Workspace"
  FOR ALL
  USING (app_private.can_access_workspace(id))
  WITH CHECK (app_private.can_write_workspace(id));

-- WorkspaceMember is deliberately not FORCEd: the SECURITY DEFINER membership
-- functions must be owned by the migration role. Use a separate non-owner runtime role.
ALTER TABLE "WorkspaceMember" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workspace_member_tenant_policy ON "WorkspaceMember";
CREATE POLICY workspace_member_tenant_policy ON "WorkspaceMember"
  FOR ALL
  USING (app_private.can_access_workspace("workspaceId"))
  WITH CHECK (app_private.can_write_workspace("workspaceId"));

DO $policy$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'WorkspaceInvitation', 'Subscription', 'Contact', 'Tag', 'Channel',
    'Conversation', 'SavedReply', 'Product', 'Pipeline', 'Order', 'Payment',
    'Invoice', 'Expense', 'Campaign', 'Automation', 'AiAgent', 'Task',
    'SupportTicket', 'AuditLog', 'WebhookEvent', 'BackgroundJob',
    'DeadLetterEvent', 'AutomationRun', 'AiUsageLog', 'SuppressionEntry'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_policy ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_policy ON %I FOR ALL USING (app_private.can_access_workspace("workspaceId")) WITH CHECK (app_private.can_write_workspace("workspaceId"))',
      table_name
    );
  END LOOP;
END
$policy$;

ALTER TABLE "ContactChannel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactChannel" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_policy ON "ContactChannel";
CREATE POLICY tenant_policy ON "ContactChannel" FOR ALL
  USING (EXISTS (SELECT 1 FROM "Contact" parent WHERE parent.id = "contactId" AND app_private.can_access_workspace(parent."workspaceId")))
  WITH CHECK (EXISTS (SELECT 1 FROM "Contact" parent WHERE parent.id = "contactId" AND app_private.can_write_workspace(parent."workspaceId")));

ALTER TABLE "ContactTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactTag" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_policy ON "ContactTag";
CREATE POLICY tenant_policy ON "ContactTag" FOR ALL
  USING (EXISTS (SELECT 1 FROM "Contact" parent WHERE parent.id = "contactId" AND app_private.can_access_workspace(parent."workspaceId")))
  WITH CHECK (EXISTS (SELECT 1 FROM "Contact" parent WHERE parent.id = "contactId" AND app_private.can_write_workspace(parent."workspaceId")));

ALTER TABLE "PipelineStage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PipelineStage" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_policy ON "PipelineStage";
CREATE POLICY tenant_policy ON "PipelineStage" FOR ALL
  USING (EXISTS (SELECT 1 FROM "Pipeline" parent WHERE parent.id = "pipelineId" AND app_private.can_access_workspace(parent."workspaceId")))
  WITH CHECK (EXISTS (SELECT 1 FROM "Pipeline" parent WHERE parent.id = "pipelineId" AND app_private.can_write_workspace(parent."workspaceId")));

ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_policy ON "Message";
CREATE POLICY tenant_policy ON "Message" FOR ALL
  USING (EXISTS (SELECT 1 FROM "Conversation" parent WHERE parent.id = "conversationId" AND app_private.can_access_workspace(parent."workspaceId")))
  WITH CHECK (EXISTS (SELECT 1 FROM "Conversation" parent WHERE parent.id = "conversationId" AND app_private.can_write_workspace(parent."workspaceId")));

ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_policy ON "OrderItem";
CREATE POLICY tenant_policy ON "OrderItem" FOR ALL
  USING (EXISTS (SELECT 1 FROM "Order" parent WHERE parent.id = "orderId" AND app_private.can_access_workspace(parent."workspaceId")))
  WITH CHECK (EXISTS (SELECT 1 FROM "Order" parent WHERE parent.id = "orderId" AND app_private.can_write_workspace(parent."workspaceId")));

ALTER TABLE "AutomationStep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AutomationStep" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_policy ON "AutomationStep";
CREATE POLICY tenant_policy ON "AutomationStep" FOR ALL
  USING (EXISTS (SELECT 1 FROM "Automation" parent WHERE parent.id = "automationId" AND app_private.can_access_workspace(parent."workspaceId")))
  WITH CHECK (EXISTS (SELECT 1 FROM "Automation" parent WHERE parent.id = "automationId" AND app_private.can_write_workspace(parent."workspaceId")));

ALTER TABLE "AiKnowledgeChunk" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiKnowledgeChunk" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_policy ON "AiKnowledgeChunk";
CREATE POLICY tenant_policy ON "AiKnowledgeChunk" FOR ALL
  USING (EXISTS (SELECT 1 FROM "AiAgent" parent WHERE parent.id = "agentId" AND app_private.can_access_workspace(parent."workspaceId")))
  WITH CHECK (EXISTS (SELECT 1 FROM "AiAgent" parent WHERE parent.id = "agentId" AND app_private.can_write_workspace(parent."workspaceId")));

ALTER TABLE "AutomationRunEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AutomationRunEvent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_policy ON "AutomationRunEvent";
CREATE POLICY tenant_policy ON "AutomationRunEvent" FOR ALL
  USING (EXISTS (SELECT 1 FROM "AutomationRun" parent WHERE parent.id = "runId" AND app_private.can_access_workspace(parent."workspaceId")))
  WITH CHECK (EXISTS (SELECT 1 FROM "AutomationRun" parent WHERE parent.id = "runId" AND app_private.can_write_workspace(parent."workspaceId")));
