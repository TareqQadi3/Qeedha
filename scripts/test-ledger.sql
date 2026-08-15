\set ON_ERROR_STOP off
\echo '--- 1. Insert test data ---'
INSERT INTO customers (id, phone, full_name, updated_at)
VALUES (gen_random_uuid(), '+966500000001', 'Ledger Test Customer', now());

INSERT INTO merchants (id, name, updated_at)
VALUES (gen_random_uuid(), 'Ledger Test Merchant', now());

INSERT INTO financing_providers (id, name, adapter_key, config, updated_at)
VALUES (gen_random_uuid(), 'Manual Test Provider', 'manual', '{}'::jsonb, now());

WITH c AS (SELECT id FROM customers WHERE phone = '+966500000001'),
     m AS (SELECT id FROM merchants WHERE name = 'Ledger Test Merchant'),
     p AS (SELECT id FROM financing_providers WHERE adapter_key = 'manual')
INSERT INTO financing_applications (id, customer_id, merchant_id, provider_id, amount, plan_type, updated_at)
SELECT gen_random_uuid(), c.id, m.id, p.id, 1000.0000, 'PAY_IN_1', now()
FROM c, m, p;

WITH a AS (SELECT id FROM financing_applications LIMIT 1),
     c AS (SELECT id FROM customers WHERE phone = '+966500000001'),
     m AS (SELECT id FROM merchants WHERE name = 'Ledger Test Merchant')
INSERT INTO wallets (id, customer_id, merchant_id, application_id, total_amount, remaining_amount, updated_at)
SELECT gen_random_uuid(), c.id, m.id, a.id, 1000.0000, 1000.0000, now()
FROM a, c, m;

WITH w AS (SELECT id FROM wallets LIMIT 1)
INSERT INTO transactions (id, wallet_id, type, amount, method, idempotency_key, updated_at)
SELECT gen_random_uuid(), w.id, 'PURCHASE', 100.0000, 'QR', 'ledger-test-key-1', now()
FROM w;

WITH t AS (SELECT id FROM transactions LIMIT 1)
INSERT INTO ledger_entries (id, transaction_ref, debit_account, credit_account, amount)
SELECT gen_random_uuid(), t.id, 'ASSET_WALLET', 'LIABILITY_PROVIDER', 100.0000
FROM t;

\echo '--- 2. Attempt UPDATE on ledger_entries ---'
UPDATE ledger_entries SET amount = 200.0000 WHERE debit_account = 'ASSET_WALLET';

\echo '--- 3. Attempt DELETE on ledger_entries ---'
DELETE FROM ledger_entries WHERE debit_account = 'ASSET_WALLET';

\echo '--- 4. Verify ledger_entries still intact ---'
SELECT id, transaction_ref, debit_account, credit_account, amount FROM ledger_entries;

\echo '--- Cleanup ---'
DELETE FROM transactions WHERE idempotency_key = 'ledger-test-key-1';
DELETE FROM wallets;
DELETE FROM financing_applications;
DELETE FROM financing_providers WHERE adapter_key = 'manual';
DELETE FROM merchants WHERE name = 'Ledger Test Merchant';
DELETE FROM customers WHERE phone = '+966500000001';
