-- CreateEnum
CREATE TYPE "PlatformStaffRole" AS ENUM ('SUPER_ADMIN', 'OPERATIONS', 'FINANCE', 'SUPPORT');

-- CreateEnum
CREATE TYPE "PlatformStaffStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "platform_staff" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "PlatformStaffRole" NOT NULL,
    "status" "PlatformStaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_staff_email_key" ON "platform_staff"("email");

-- CreateIndex
CREATE INDEX "platform_staff_role_status_idx" ON "platform_staff"("role", "status");

