-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "platform_staff_id" UUID;

-- CreateIndex
CREATE INDEX "refresh_tokens_platform_staff_id_idx" ON "refresh_tokens"("platform_staff_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_platform_staff_id_fkey" FOREIGN KEY ("platform_staff_id") REFERENCES "platform_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

