CREATE TABLE IF NOT EXISTS "Message" (
  "id"           SERIAL PRIMARY KEY,
  "fromUsername" TEXT NOT NULL,
  "toUsername"   TEXT NOT NULL,
  "body"         TEXT NOT NULL,
  "readAt"       TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Message_toUsername_readAt_idx" ON "Message"("toUsername", "readAt");
CREATE INDEX IF NOT EXISTS "Message_fromUsername_toUsername_idx" ON "Message"("fromUsername", "toUsername");
