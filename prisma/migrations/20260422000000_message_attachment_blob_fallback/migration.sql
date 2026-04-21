ALTER TABLE "message_attachments"
ADD COLUMN IF NOT EXISTS "blobData" BYTEA;

ALTER TABLE "message_attachment_versions"
ADD COLUMN IF NOT EXISTS "blobData" BYTEA;
