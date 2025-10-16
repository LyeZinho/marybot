-- AlterTable
ALTER TABLE "user_items" ADD COLUMN     "equipSlot" TEXT,
ADD COLUMN     "isEquipped" BOOLEAN NOT NULL DEFAULT false;
