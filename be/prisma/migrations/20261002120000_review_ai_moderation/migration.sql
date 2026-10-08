CREATE TYPE "ReviewModerationSource" AS ENUM ('RULE', 'AI', 'ADMIN');

ALTER TABLE "Review"
ADD COLUMN "moderationSource" "ReviewModerationSource",
ADD COLUMN "analysisReasons" JSONB;
