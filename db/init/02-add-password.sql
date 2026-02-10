-- =============================================
-- Migration: Add password support to chatbot_users
-- =============================================

ALTER TABLE chatbot_users
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Update test user with email and bcrypt hash of "test1234"
UPDATE chatbot_users
SET email = 'test@test.com',
    password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE external_id = 'user-001' AND password_hash IS NULL;
