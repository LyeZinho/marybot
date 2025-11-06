-- AlterTable
ALTER TABLE "guild_configs" ADD COLUMN     "welcomeBackgroundColor" TEXT NOT NULL DEFAULT '#1a1a2e',
ADD COLUMN     "welcomeBackgroundUrl" TEXT,
ADD COLUMN     "welcomeChannelId" TEXT,
ADD COLUMN     "welcomeDeleteAfter" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "welcomeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "welcomeMentionUser" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "welcomeMessage" TEXT NOT NULL DEFAULT 'Bem-vindo(a)!';
