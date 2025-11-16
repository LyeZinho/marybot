-- CreateTable
CREATE TABLE "media_memory" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contextType" TEXT NOT NULL,
    "contextConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "sentiment" TEXT NOT NULL DEFAULT 'neutral',
    "keywords" TEXT,
    "metadata" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_memory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_memory_guildId_createdAt_idx" ON "media_memory"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "media_memory_authorId_idx" ON "media_memory"("authorId");

-- CreateIndex
CREATE INDEX "media_memory_mediaType_contextType_idx" ON "media_memory"("mediaType", "contextType");

-- CreateIndex
CREATE INDEX "media_memory_sentiment_idx" ON "media_memory"("sentiment");
