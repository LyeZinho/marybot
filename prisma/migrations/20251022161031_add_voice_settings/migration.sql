-- AlterTable
ALTER TABLE "guild_configs" ADD COLUMN     "voiceAllowedRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "voiceBitrate" INTEGER NOT NULL DEFAULT 64000,
ADD COLUMN     "voiceChannelTemplate" TEXT NOT NULL DEFAULT '🎤 Canal #{number}',
ADD COLUMN     "voiceCreatorPermissions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "voiceDeleteWhenEmpty" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "voiceEmptyTimeout" INTEGER NOT NULL DEFAULT 30000,
ADD COLUMN     "voiceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "voiceMaxChannels" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "voiceParentChannel" TEXT,
ADD COLUMN     "voiceUserLimit" INTEGER NOT NULL DEFAULT 0;
