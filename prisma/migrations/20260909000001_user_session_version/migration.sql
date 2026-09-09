-- Bumping this on a user forces every browser session of theirs to be
-- treated as logged out on their next request, without needing a
-- server-side session store — the signed cookie carries the version it
-- was issued with, and getSessionUser() rejects a mismatch.
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
