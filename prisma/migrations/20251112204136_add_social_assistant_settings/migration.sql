-- AlterTable
ALTER TABLE "guild_configs" ADD COLUMN     "socialActivationChance" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
ADD COLUMN     "socialAllowDuckDuckGo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "socialAllowExternalAPIs" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "socialAllowTenor" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "socialChannelId" TEXT,
ADD COLUMN     "socialEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "socialEnrichmentChance" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
ADD COLUMN     "socialIdleTime" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "socialKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "socialMinInterval" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "socialPersonality" TEXT NOT NULL DEFAULT 'friendly',
ADD COLUMN     "socialReactionChance" DOUBLE PRECISION NOT NULL DEFAULT 0.1;
