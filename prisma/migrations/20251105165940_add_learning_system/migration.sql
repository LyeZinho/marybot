-- CreateTable
CREATE TABLE "message_memory" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "originalContent" TEXT NOT NULL,
    "embedding" TEXT,
    "relevance" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "reactions" INTEGER NOT NULL DEFAULT 0,
    "mentions" INTEGER NOT NULL DEFAULT 0,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "sentiment" TEXT,
    "topics" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_context" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "personality" TEXT NOT NULL DEFAULT 'friendly',
    "learningEnabled" BOOLEAN NOT NULL DEFAULT true,
    "responseRate" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "minWordCount" INTEGER NOT NULL DEFAULT 3,
    "maxMemorySize" INTEGER NOT NULL DEFAULT 10000,
    "blacklistedWords" TEXT,
    "whitelistedChannels" TEXT,
    "topics" TEXT,
    "lastCleanup" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_context_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_memory_guildId_createdAt_idx" ON "message_memory"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "message_memory_authorId_idx" ON "message_memory"("authorId");

-- CreateIndex
CREATE INDEX "message_memory_relevance_idx" ON "message_memory"("relevance");

-- CreateIndex
CREATE UNIQUE INDEX "guild_context_guildId_key" ON "guild_context"("guildId");
