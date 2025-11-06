-- CreateTable
CREATE TABLE "guild_configs" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "commandsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dungeonEnabled" BOOLEAN NOT NULL DEFAULT true,
    "economyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "animeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "primaryColor" TEXT NOT NULL DEFAULT '#5865f2',
    "successColor" TEXT NOT NULL DEFAULT '#00ff00',
    "errorColor" TEXT NOT NULL DEFAULT '#ff0000',
    "warningColor" TEXT NOT NULL DEFAULT '#ffff00',
    "pingEmoji" TEXT NOT NULL DEFAULT '🏓',
    "helpEmoji" TEXT NOT NULL DEFAULT '📚',
    "successEmoji" TEXT NOT NULL DEFAULT '✅',
    "errorEmoji" TEXT NOT NULL DEFAULT '❌',
    "warningEmoji" TEXT NOT NULL DEFAULT '⚠️',
    "loadingEmoji" TEXT NOT NULL DEFAULT '⏳',
    "defaultCooldown" INTEGER NOT NULL DEFAULT 3000,
    "dungeonCooldown" INTEGER NOT NULL DEFAULT 2000,
    "economyCooldown" INTEGER NOT NULL DEFAULT 5000,
    "dailyAmount" INTEGER NOT NULL DEFAULT 100,
    "dailyCooldown" INTEGER NOT NULL DEFAULT 86400000,
    "maxDungeonFloor" INTEGER NOT NULL DEFAULT 50,
    "startingHp" INTEGER NOT NULL DEFAULT 100,
    "xpMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "coinMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "dungeonChannelId" TEXT,
    "economyChannelId" TEXT,
    "logChannelId" TEXT,
    "adminRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "moderatorRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guild_configs_guildId_key" ON "guild_configs"("guildId");

-- AddForeignKey
ALTER TABLE "guild_configs" ADD CONSTRAINT "guild_configs_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
