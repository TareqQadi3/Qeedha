-- CreateIndex
CREATE UNIQUE INDEX "settlements_merchant_id_period_key" ON "settlements"("merchant_id", "period");
