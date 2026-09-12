-- 020_bank_settings.sql
-- Seed default bank/challan settings for fee challan printing

INSERT INTO settings (key, value, updated_at) VALUES
  ('bank_name',          '',  NOW()),
  ('bank_account_title', '',  NOW()),
  ('bank_account_no',    '',  NOW()),
  ('bank_iban',          '',  NOW()),
  ('bank_branch',        '',  NOW()),
  ('bank_branch_code',   '',  NOW())
ON CONFLICT (key) DO NOTHING;
