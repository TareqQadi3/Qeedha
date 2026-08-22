-- AlterEnum
ALTER TYPE "NotificationChannel" ADD VALUE 'WHATSAPP';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");
