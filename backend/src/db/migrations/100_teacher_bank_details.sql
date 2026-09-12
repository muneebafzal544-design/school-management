-- Migration 100: Bank account details for salary transfers
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS bank_name        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bank_account_no  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_iban        VARCHAR(30),
  ADD COLUMN IF NOT EXISTS bank_branch      VARCHAR(100);
