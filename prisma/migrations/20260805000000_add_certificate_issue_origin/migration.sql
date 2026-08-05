-- Existing certificates are classified as manual without inventing a reason.
ALTER TABLE "certificates"
ADD COLUMN "issue_source" VARCHAR(64) NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "issue_reason" VARCHAR(500),
ADD COLUMN "issue_comment" VARCHAR(2000),
ADD COLUMN "issue_group_id" UUID,
ADD COLUMN "source_event_id" VARCHAR(255);

CREATE INDEX "certificates_issue_source_idx"
ON "certificates"("issue_source");

CREATE INDEX "certificates_issue_group_id_idx"
ON "certificates"("issue_group_id");

-- PostgreSQL unique indexes allow multiple rows when source_event_id is NULL.
CREATE UNIQUE INDEX "certificates_issue_source_source_event_id_key"
ON "certificates"("issue_source", "source_event_id");
