/*
  Warnings:

  - You are about to drop the column `socialActivationChance` on the `guild_configs` table. All the data in the column will be lost.
  - You are about to drop the column `socialAllowDuckDuckGo` on the `guild_configs` table. All the data in the column will be lost.
  - You are about to drop the column `socialAllowExternalAPIs` on the `guild_configs` table. All the data in the column will be lost.
  - You are about to drop the column `socialAllowTenor` on the `guild_configs` table. All the data in the column will be lost.
  - You are about to drop the column `socialChannelId` on the `guild_configs` table. All the data in the column will be lost.
  - You are about to drop the column `socialEnabled` on the `guild_configs` table. All the data in the column will be lost.
  - You are about to drop the column `socialEnrichmentChance` on the `guild_configs` table. All the data in the column will be lost.
  - You are about to drop the column `socialIdleTime` on the `guild_configs` table. All the data in the column will be lost.
  - You are about to drop the column `socialKeywords` on the `guild_configs` table. All the data in the column will be lost.
  - You are about to drop the column `socialMinInterval` on the `guild_configs` table. All the data in the column will be lost.
  - You are about to drop the column `socialPersonality` on the `guild_configs` table. All the data in the column will be lost.
  - You are about to drop the column `socialReactionChance` on the `guild_configs` table. All the data in the column will be lost.
  - You are about to drop the `media_memory` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "guild_configs" DROP COLUMN "socialActivationChance",
DROP COLUMN "socialAllowDuckDuckGo",
DROP COLUMN "socialAllowExternalAPIs",
DROP COLUMN "socialAllowTenor",
DROP COLUMN "socialChannelId",
DROP COLUMN "socialEnabled",
DROP COLUMN "socialEnrichmentChance",
DROP COLUMN "socialIdleTime",
DROP COLUMN "socialKeywords",
DROP COLUMN "socialMinInterval",
DROP COLUMN "socialPersonality",
DROP COLUMN "socialReactionChance",
ADD COLUMN     "nsfwAutoDeleteWarning" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nsfwDeleteMessage" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nsfwEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nsfwModChannelId" TEXT,
ADD COLUMN     "nsfwNotifyMods" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nsfwPunishment" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "nsfwSendWarning" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nsfwSensitivity" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
ADD COLUMN     "nsfwStrictMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nsfwWhitelistedChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "nsfwWhitelistedRoles" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropTable
DROP TABLE "media_memory";
