-- CreateEnum
CREATE TYPE "ApiCredentialStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "external_transaction_id" TEXT,
ADD COLUMN     "external_system" TEXT,
ADD COLUMN     "invoice_reference" TEXT;

-- CreateTable
CREATE TABLE "merchant_api_credentials" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "api_secret_hash" TEXT NOT NULL,
    "status" "ApiCredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "merchant_api_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_customer_mappings" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "external_system" TEXT NOT NULL,
    "external_customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_customer_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "secret_encrypted" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL,
    "endpoint_id" UUID NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "response_status" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_external_system_external_transaction_id_key" ON "transactions"("external_system", "external_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_api_credentials_api_key_key" ON "merchant_api_credentials"("api_key");

-- CreateIndex
CREATE INDEX "merchant_api_credentials_merchant_id_idx" ON "merchant_api_credentials"("merchant_id");

-- CreateIndex
CREATE INDEX "external_customer_mappings_merchant_id_customer_id_idx" ON "external_customer_mappings"("merchant_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_customer_mappings_merchant_id_external_system_ext_key" ON "external_customer_mappings"("merchant_id", "external_system", "external_customer_id");

-- CreateIndex
CREATE INDEX "webhook_endpoints_merchant_id_idx" ON "webhook_endpoints"("merchant_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_endpoint_id_created_at_idx" ON "webhook_deliveries"("endpoint_id", "created_at");

-- AddForeignKey
ALTER TABLE "merchant_api_credentials" ADD CONSTRAINT "merchant_api_credentials_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_customer_mappings" ADD CONSTRAINT "external_customer_mappings_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_customer_mappings" ADD CONSTRAINT "external_customer_mappings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
