-- CreateEnum
CREATE TYPE "AiChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "AiChatConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Cuộc trò chuyện mới',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AiChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiChatConversation_userId_updatedAt_idx" ON "AiChatConversation"("userId", "updatedAt");
CREATE INDEX "AiChatMessage_conversationId_createdAt_idx" ON "AiChatMessage"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiChatConversation" ADD CONSTRAINT "AiChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiChatMessage" ADD CONSTRAINT "AiChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
