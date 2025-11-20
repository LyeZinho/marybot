-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "channelId" TEXT,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER NOT NULL DEFAULT 0,
    "temporary" BOOLEAN NOT NULL DEFAULT false,
    "maxAge" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_uses" (
    "id" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "rewardGiven" BOOLEAN NOT NULL DEFAULT false,
    "rewardAmount" INTEGER NOT NULL DEFAULT 0,
    "fraudReason" TEXT,

    CONSTRAINT "invite_uses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_config" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rewardPerInvite" INTEGER NOT NULL DEFAULT 100,
    "bonusThresholds" TEXT,
    "minAccountAge" INTEGER NOT NULL DEFAULT 7,
    "minStayTime" INTEGER NOT NULL DEFAULT 24,
    "maxRewardPerDay" INTEGER NOT NULL DEFAULT 1000,
    "fraudDetection" BOOLEAN NOT NULL DEFAULT true,
    "logChannelId" TEXT,
    "adminRoles" TEXT,
    "exemptFromAntifraud" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invite_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invites_code_key" ON "invites"("code");

-- CreateIndex
CREATE INDEX "invites_guildId_idx" ON "invites"("guildId");

-- CreateIndex
CREATE INDEX "invites_inviterId_idx" ON "invites"("inviterId");

-- CreateIndex
CREATE INDEX "invites_code_idx" ON "invites"("code");

-- CreateIndex
CREATE INDEX "invite_uses_guildId_idx" ON "invite_uses"("guildId");

-- CreateIndex
CREATE INDEX "invite_uses_inviterId_idx" ON "invite_uses"("inviterId");

-- CreateIndex
CREATE INDEX "invite_uses_inviteeId_idx" ON "invite_uses"("inviteeId");

-- CreateIndex
CREATE INDEX "invite_uses_joinedAt_idx" ON "invite_uses"("joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "invite_config_guildId_key" ON "invite_config"("guildId");

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("discordId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_uses" ADD CONSTRAINT "invite_uses_inviteCode_fkey" FOREIGN KEY ("inviteCode") REFERENCES "invites"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_uses" ADD CONSTRAINT "invite_uses_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("discordId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_uses" ADD CONSTRAINT "invite_uses_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_config" ADD CONSTRAINT "invite_config_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
