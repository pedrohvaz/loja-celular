-- CreateIndex
CREATE INDEX "campaigns_tenantId_idx" ON "campaigns"("tenantId");

-- CreateIndex
CREATE INDEX "cash_registers_tenantId_idx" ON "cash_registers"("tenantId");

-- CreateIndex
CREATE INDEX "cash_registers_tenantId_status_idx" ON "cash_registers"("tenantId", "status");

-- CreateIndex
CREATE INDEX "customers_tenantId_idx" ON "customers"("tenantId");

-- CreateIndex
CREATE INDEX "finance_categories_tenantId_idx" ON "finance_categories"("tenantId");

-- CreateIndex
CREATE INDEX "orders_tenantId_idx" ON "orders"("tenantId");

-- CreateIndex
CREATE INDEX "orders_tenantId_status_idx" ON "orders"("tenantId", "status");

-- CreateIndex
CREATE INDEX "products_tenantId_idx" ON "products"("tenantId");

-- CreateIndex
CREATE INDEX "products_tenantId_category_idx" ON "products"("tenantId", "category");

-- CreateIndex
CREATE INDEX "products_tenantId_inStock_idx" ON "products"("tenantId", "inStock");

-- CreateIndex
CREATE INDEX "service_orders_tenantId_idx" ON "service_orders"("tenantId");

-- CreateIndex
CREATE INDEX "service_orders_tenantId_status_idx" ON "service_orders"("tenantId", "status");

-- CreateIndex
CREATE INDEX "transactions_tenantId_idx" ON "transactions"("tenantId");

-- CreateIndex
CREATE INDEX "transactions_tenantId_status_idx" ON "transactions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "transactions_tenantId_type_idx" ON "transactions"("tenantId", "type");

-- CreateIndex
CREATE INDEX "transactions_tenantId_transactionDate_idx" ON "transactions"("tenantId", "transactionDate");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");
