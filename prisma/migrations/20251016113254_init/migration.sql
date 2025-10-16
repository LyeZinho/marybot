-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DAILY', 'WORK', 'CRIME', 'GAMBLE_WIN', 'GAMBLE_LOSS', 'TRANSFER_SENT', 'TRANSFER_RECEIVED', 'SHOP_BUY', 'SHOP_SELL', 'ADMIN_ADD', 'ADMIN_REMOVE', 'DUNGEON_REWARD', 'BATTLE_WIN', 'RAID_REWARD');

-- CreateEnum
CREATE TYPE "PlayerClass" AS ENUM ('ADVENTURER', 'WARRIOR', 'MAGE', 'ROGUE', 'CLERIC', 'PALADIN', 'NECROMANCER', 'NINJA', 'BERSERKER', 'ARCHMAGE');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('EMPTY', 'MONSTER', 'TRAP', 'EVENT', 'BOSS', 'SHOP', 'LOOT', 'ENTRANCE', 'EXIT');

-- CreateEnum
CREATE TYPE "MobType" AS ENUM ('BEAST', 'HUMANOID', 'UNDEAD', 'ELEMENTAL', 'DRAGON', 'DEMON', 'CONSTRUCT');

-- CreateEnum
CREATE TYPE "SkillType" AS ENUM ('ATTACK', 'HEAL', 'BUFF', 'DEBUFF', 'SPECIAL');

-- CreateEnum
CREATE TYPE "StatusEffect" AS ENUM ('POISONED', 'BURNED', 'FROZEN', 'STUNNED', 'BLEEDING', 'REGENERATING', 'BLESSED', 'CURSED', 'HASTE', 'SLOW');

-- CreateEnum
CREATE TYPE "BiomeType" AS ENUM ('CRYPT', 'VOLCANO', 'FOREST', 'GLACIER', 'RUINS', 'ABYSS');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "bank" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "lastDaily" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hp" INTEGER NOT NULL DEFAULT 100,
    "maxHp" INTEGER NOT NULL DEFAULT 100,
    "atk" INTEGER NOT NULL DEFAULT 10,
    "def" INTEGER NOT NULL DEFAULT 5,
    "spd" INTEGER NOT NULL DEFAULT 8,
    "lck" INTEGER NOT NULL DEFAULT 5,
    "playerClass" "PlayerClass" NOT NULL DEFAULT 'ADVENTURER',
    "skillPoints" INTEGER NOT NULL DEFAULT 0,
    "dungeonXp" INTEGER NOT NULL DEFAULT 0,
    "dungeonLevel" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "rarity" "Rarity" NOT NULL DEFAULT 'COMMON',
    "category" TEXT NOT NULL,
    "emoji" TEXT,
    "tradeable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guilds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT DEFAULT 'm.',
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_commands" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dungeon_runs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "currentFloor" INTEGER NOT NULL DEFAULT 1,
    "positionX" INTEGER NOT NULL DEFAULT 0,
    "positionY" INTEGER NOT NULL DEFAULT 0,
    "mapData" JSONB NOT NULL,
    "inventory" JSONB NOT NULL,
    "health" INTEGER NOT NULL DEFAULT 100,
    "maxHealth" INTEGER NOT NULL DEFAULT 100,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "biome" "BiomeType" NOT NULL DEFAULT 'CRYPT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "dungeon_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MobType" NOT NULL,
    "levelMin" INTEGER NOT NULL,
    "levelMax" INTEGER NOT NULL,
    "description" TEXT,
    "emoji" TEXT,
    "baseHp" INTEGER NOT NULL,
    "baseAtk" INTEGER NOT NULL,
    "baseDef" INTEGER NOT NULL,
    "baseSpd" INTEGER NOT NULL,
    "baseLck" INTEGER NOT NULL,
    "skills" TEXT[],
    "lootTable" JSONB NOT NULL,
    "biomes" "BiomeType"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "SkillType" NOT NULL,
    "power" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "cooldown" INTEGER NOT NULL DEFAULT 0,
    "heal" INTEGER NOT NULL DEFAULT 0,
    "effects" JSONB,
    "classRequired" "PlayerClass",
    "levelRequired" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_skills" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "player_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dungeonRunId" TEXT,
    "raidId" TEXT,
    "mobName" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "damageDealt" INTEGER NOT NULL DEFAULT 0,
    "damageTaken" INTEGER NOT NULL DEFAULT 0,
    "xpGained" INTEGER NOT NULL DEFAULT 0,
    "coinsGained" INTEGER NOT NULL DEFAULT 0,
    "loot" JSONB,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battle_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raids" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "bossName" TEXT NOT NULL,
    "bossHp" INTEGER NOT NULL,
    "currentHp" INTEGER NOT NULL,
    "maxPlayers" INTEGER NOT NULL DEFAULT 20,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raid_participations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "raidId" TEXT NOT NULL,
    "damageDealt" INTEGER NOT NULL DEFAULT 0,
    "healsGiven" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raid_participations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_discordId_key" ON "users"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "items_name_key" ON "items"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_items_userId_itemId_key" ON "user_items"("userId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_commands_guildId_name_key" ON "custom_commands"("guildId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "player_skills_userId_skillId_key" ON "player_skills"("userId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "raid_participations_userId_raidId_key" ON "raid_participations"("userId", "raidId");

-- AddForeignKey
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dungeon_runs" ADD CONSTRAINT "dungeon_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_skills" ADD CONSTRAINT "player_skills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_skills" ADD CONSTRAINT "player_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_logs" ADD CONSTRAINT "battle_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_logs" ADD CONSTRAINT "battle_logs_dungeonRunId_fkey" FOREIGN KEY ("dungeonRunId") REFERENCES "dungeon_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_logs" ADD CONSTRAINT "battle_logs_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "raids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raid_participations" ADD CONSTRAINT "raid_participations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raid_participations" ADD CONSTRAINT "raid_participations_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "raids"("id") ON DELETE CASCADE ON UPDATE CASCADE;
